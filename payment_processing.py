"""
Payment Processing with Fees Module for RentKeepers
Integrates Stripe with automatic fee calculation
"""
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from flask_cors import cross_origin
from models import get_db_session, Payment, Tenant, User
from datetime import datetime
import stripe
import os

# Create blueprint
payments_bp = Blueprint('payments', __name__, url_prefix='/api/payments')


class PaymentFeeCalculator:
    """Calculate payment fees based on payment method and user tier"""
    
    # Base Stripe rates
    STRIPE_CARD_RATE = 0.029  # 2.9%
    STRIPE_CARD_FIXED = 0.30  # $0.30
    STRIPE_ACH_RATE = 0.008  # 0.8% (capped at $5)
    STRIPE_ACH_FIXED = 0.00
    STRIPE_ACH_CAP = 500  # $5.00 in cents
    
    # Platform fees (RentKeepers cut)
    PLATFORM_CARD_RATE = 0.00  # No additional fee for now
    PLATFORM_ACH_RATE = 0.00   # Free for ACH
    
    @classmethod
    def calculate_fees(cls, amount_cents, payment_method='card', user_tier='free'):
        """
        Calculate fees for a payment
        
        Args:
            amount_cents: Rent amount in cents
            payment_method: 'card', 'ach', 'bank_transfer', 'check'
            user_tier: 'free', 'premium', 'lifetime'
        
        Returns:
            dict with fee breakdown
        """
        amount_dollars = amount_cents / 100
        
        if payment_method == 'card':
            # Stripe fee
            stripe_fee = int(amount_cents * cls.STRIPE_CARD_RATE) + int(cls.STRIPE_CARD_FIXED * 100)
            # Platform fee (waived for premium)
            if user_tier in ['premium', 'lifetime']:
                platform_fee = 0
            else:
                platform_fee = int(amount_cents * cls.PLATFORM_CARD_RATE)
            
            total_fee = stripe_fee + platform_fee
            
        elif payment_method == 'ach':
            # ACH fees
            stripe_fee = int(amount_cents * cls.STRIPE_ACH_RATE) + int(cls.STRIPE_ACH_FIXED * 100)
            # Cap at $5
            if stripe_fee > cls.STRIPE_ACH_CAP:
                stripe_fee = cls.STRIPE_ACH_CAP
            platform_fee = int(amount_cents * cls.PLATFORM_ACH_RATE)
            total_fee = stripe_fee + platform_fee
            
        elif payment_method in ['check', 'cash', 'bank_transfer']:
            # Manual methods - no fees
            stripe_fee = 0
            platform_fee = 0
            total_fee = 0
        else:
            raise ValueError(f"Invalid payment method: {payment_method}")
        
        return {
            'rent_amount': amount_cents,
            'rent_amount_formatted': f"${amount_dollars:.2f}",
            'stripe_fee': stripe_fee,
            'stripe_fee_formatted': f"${stripe_fee / 100:.2f}",
            'platform_fee': platform_fee,
            'platform_fee_formatted': f"${platform_fee / 100:.2f}",
            'total_fee': total_fee,
            'total_fee_formatted': f"${total_fee / 100:.2f}",
            'tenant_pays': amount_cents + total_fee,
            'tenant_pays_formatted': f"${(amount_cents + total_fee) / 100:.2f}",
            'landlord_receives': amount_cents,
            'landlord_receives_formatted': f"${amount_dollars:.2f}",
            'payment_method': payment_method,
            'fee_percentage': (total_fee / amount_cents * 100) if amount_cents > 0 else 0
        }


@payments_bp.route('/calculate-fees', methods=['POST'])
@cross_origin(supports_credentials=True)
@login_required
def calculate_fees():
    """Calculate fees for a payment before processing"""
    data = request.get_json()
    
    tenant_id = data.get('tenant_id')
    payment_method = data.get('payment_method', 'card')
    
    if not tenant_id:
        return jsonify({'error': 'Tenant ID required'}), 400
    
    db = get_db_session()
    try:
        # Get tenant and verify ownership
        tenant = db.query(Tenant).filter_by(
            id=tenant_id,
            user_id=current_user.id
        ).first()
        
        if not tenant:
            return jsonify({'error': 'Tenant not found'}), 404
        
        # Calculate rent amount in cents
        rent_cents = int(tenant.monthly_rent * 100)
        
        # Calculate fees
        user_tier = current_user.subscription_tier
        fees = PaymentFeeCalculator.calculate_fees(rent_cents, payment_method, user_tier)
        
        return jsonify({
            'success': True,
            'fees': fees,
            'tenant': {
                'id': tenant.id,
                'name': tenant.name,
                'monthly_rent': tenant.monthly_rent
            }
        })
    finally:
        db.close()


@payments_bp.route('/create-payment-intent', methods=['POST'])
@cross_origin(supports_credentials=True)
@login_required
def create_payment_intent():
    """Create a Stripe PaymentIntent with fees"""
    data = request.get_json()
    
    tenant_id = data.get('tenant_id')
    payment_method = data.get('payment_method', 'card')
    for_month = data.get('for_month')  # YYYY-MM format
    
    if not all([tenant_id, for_month]):
        return jsonify({'error': 'Tenant ID and month required'}), 400
    
    # Validate month format
    try:
        datetime.strptime(for_month, '%Y-%m')
    except ValueError:
        return jsonify({'error': 'Invalid month format. Use YYYY-MM'}), 400
    
    db = get_db_session()
    try:
        # Get tenant
        tenant = db.query(Tenant).filter_by(
            id=tenant_id,
            user_id=current_user.id
        ).first()
        
        if not tenant:
            return jsonify({'error': 'Tenant not found'}), 404
        
        # Check if payment already exists for this month
        existing = db.query(Payment).filter_by(
            tenant_id=tenant_id,
            for_month=for_month,
            status='completed'
        ).first()
        
        if existing:
            return jsonify({
                'error': 'Payment already recorded for this month',
                'payment_id': existing.id
            }), 409
        
        # Calculate amounts
        rent_cents = int(tenant.monthly_rent * 100)
        user_tier = current_user.subscription_tier
        fees = PaymentFeeCalculator.calculate_fees(rent_cents, payment_method, user_tier)
        
        total_cents = fees['tenant_pays']
        
        # Create Stripe PaymentIntent
        try:
            intent = stripe.PaymentIntent.create(
                amount=total_cents,
                currency='usd',
                automatic_payment_methods={'enabled': True},
                metadata={
                    'tenant_id': tenant_id,
                    'landlord_id': current_user.id,
                    'for_month': for_month,
                    'rent_amount': rent_cents,
                    'fee_amount': fees['total_fee'],
                    'payment_method': payment_method
                },
                receipt_email=tenant.email if tenant.email else None
            )
            
            return jsonify({
                'success': True,
                'client_secret': intent.client_secret,
                'payment_intent_id': intent.id,
                'fees': fees
            })
            
        except stripe.error.StripeError as e:
            return jsonify({'error': str(e)}), 400
            
    finally:
        db.close()


@payments_bp.route('/webhook', methods=['POST'])
def webhook():
    """Handle Stripe webhook events"""
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')
    webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
    
    if not webhook_secret:
        return jsonify({'error': 'Webhook secret not configured'}), 500
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError:
        return jsonify({'error': 'Invalid signature'}), 400
    
    # Handle specific events
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        handle_successful_payment(payment_intent)
    
    elif event['type'] == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        handle_failed_payment(payment_intent)
    
    elif event['type'] == 'charge.refunded':
        charge = event['data']['object']
        handle_refund(charge)
    
    return jsonify({'status': 'success'}), 200


def handle_successful_payment(payment_intent):
    """Process successful payment"""
    metadata = payment_intent.get('metadata', {})
    
    tenant_id = metadata.get('tenant_id')
    landlord_id = metadata.get('landlord_id')
    for_month = metadata.get('for_month')
    rent_amount = int(metadata.get('rent_amount', 0))
    fee_amount = int(metadata.get('fee_amount', 0))
    
    if not tenant_id or not landlord_id:
        return
    
    db = get_db_session()
    try:
        # Create payment record
        payment = Payment(
            tenant_id=int(tenant_id),
            user_id=int(landlord_id),
            amount_paid=rent_amount / 100,  # Convert cents to dollars
            rent_amount=rent_amount / 100,
            fee_amount=fee_amount / 100,
            total_amount=(rent_amount + fee_amount) / 100,
            stripe_fee=fee_amount / 100,  # Simplified - actual Stripe fee may differ
            platform_fee=0,  # No platform fee currently
            for_month=for_month,
            payment_method='card',
            payment_type='rent',
            status='completed',
            stripe_payment_intent_id=payment_intent['id'],
            stripe_charge_id=payment_intent.get('charges', {}).get('data', [{}])[0].get('id')
        )
        db.add(payment)
        db.commit()
        
        # TODO: Send confirmation email to tenant and landlord
        
    finally:
        db.close()


def handle_failed_payment(payment_intent):
    """Handle failed payment"""
    # Log failure but don't create payment record
    print(f"Payment failed: {payment_intent.get('id')}")
    # Could send failure notification here


def handle_refund(charge):
    """Handle refunded payment"""
    db = get_db_session()
    try:
        # Find payment by charge ID
        payment = db.query(Payment).filter_by(
            stripe_charge_id=charge['id']
        ).first()
        
        if payment:
            payment.refunded_amount = charge['amount_refunded'] / 100
            payment.refund_date = datetime.utcnow()
            payment.status = 'refunded' if charge['refunded'] else 'partially_refunded'
            db.commit()
    finally:
        db.close()


@payments_bp.route('/history/<tenant_id>', methods=['GET'])
@cross_origin(supports_credentials=True)
@login_required
def get_payment_history(tenant_id):
    """Get payment history for a tenant"""
    db = get_db_session()
    try:
        # Verify tenant belongs to current user
        tenant = db.query(Tenant).filter_by(
            id=tenant_id,
            user_id=current_user.id
        ).first()
        
        if not tenant:
            return jsonify({'error': 'Tenant not found'}), 404
        
        # Get payments
        payments = db.query(Payment).filter_by(
            tenant_id=tenant_id
        ).order_by(Payment.payment_date.desc()).all()
        
        return jsonify({
            'success': True,
            'payments': [{
                'id': p.id,
                'amount_paid': p.amount_paid,
                'fee_amount': p.fee_amount,
                'total_amount': p.total_amount,
                'for_month': p.for_month,
                'payment_date': p.payment_date.isoformat() if p.payment_date else None,
                'payment_method': p.payment_method,
                'status': p.status,
                'stripe_payment_intent_id': p.stripe_payment_intent_id
            } for p in payments]
        })
    finally:
        db.close()


def init_payment_routes(app):
    """Initialize payment routes on Flask app"""
    app.register_blueprint(payments_bp)
    
    # Configure Stripe
    stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
    if not stripe.api_key:
        print("Warning: STRIPE_SECRET_KEY not set. Payment processing disabled.")
