"""
Tenant Portal Routes - Token-based access for tenants
Handles: Rent payments, maintenance requests, messaging landlord
"""

from flask import Blueprint, render_template, redirect, url_for, flash, request, session
from models import Tenant, Payment, MaintenanceRequest, User, get_db_session
from datetime import datetime, date
import secrets
import stripe

tenant_portal = Blueprint('tenant_portal', __name__)

@tenant_portal.route('/portal/<token>')
def tenant_portal_home(token):
    """Tenant portal home - view rent status and payment history"""
    db_session = get_db_session()
    try:
        tenant = db_session.query(Tenant).filter_by(portal_token=token, portal_enabled=True).first()
        
        if not tenant:
            flash('Invalid or expired portal link', 'error')
            return redirect(url_for('login'))
        
        # Store tenant info in session for other routes
        session['tenant_id'] = tenant.id
        session['tenant_token'] = token
        
        # Get payment history
        payments = db_session.query(Payment).filter_by(tenant_id=tenant.id).order_by(Payment.payment_date.desc()).all()[:12]
        
        # Calculate current month status
        today = date.today()
        current_month = today.strftime('%Y-%m')
        current_payment = next((p for p in payments if p.for_month == current_month), None)
        
        amount_due = tenant.monthly_rent
        if current_payment:
            amount_due = max(0, tenant.monthly_rent - current_payment.amount_paid)
        
        status = 'paid' if amount_due == 0 else ('late' if today.day > tenant.due_day else 'pending')
        
        # Calculate next due date
        import calendar
        due_day = min(tenant.due_day, calendar.monthrange(today.year, today.month)[1])
        due_date = date(today.year, today.month, due_day)
        if due_date < today and status != 'paid':
            next_month = today.replace(day=1) + timedelta(days=32)
            next_due_day = min(tenant.due_day, calendar.monthrange(next_month.year, next_month.month)[1])
            due_date = date(next_month.year, next_month.month, next_due_day)
        
        return render_template('tenant_portal.html',
                             tenant=tenant,
                             payments=payments,
                             status=status,
                             amount_due=amount_due,
                             due_date=due_date,
                             current_month=current_month,
                             token=token,
                             stripe_publishable_key=request.app.config.get('STRIPE_PUBLISHABLE_KEY'))
    finally:
        db_session.close()


@tenant_portal.route('/portal/<token>/pay', methods=['GET', 'POST'])
def submit_payment(token):
    """Submit rent payment via Stripe with AVS address verification"""
    db_session = get_db_session()
    try:
        tenant = db_session.query(Tenant).filter_by(portal_token=token, portal_enabled=True).first()
        
        if not tenant:
            flash('Invalid portal link', 'error')
            return redirect(url_for('login'))
        
        if request.method == 'POST':
            try:
                stripe.api_key = request.app.config.get('STRIPE_SECRET_KEY')
                
                amount = float(request.form.get('amount', tenant.monthly_rent))
                payment_method = request.form.get('payment_method_id')
                
                # Get billing address for AVS verification
                billing_address = {
                    'line1': request.form.get('billing_street', ''),
                    'city': request.form.get('billing_city', ''),
                    'state': request.form.get('billing_state', ''),
                    'postal_code': request.form.get('billing_zip', ''),
                    'country': request.form.get('billing_country', 'US')
                }
                
                # Validate billing address
                if not all([billing_address['line1'], billing_address['city'], 
                           billing_address['state'], billing_address['postal_code']]):
                    flash('Please provide complete billing address for verification', 'error')
                    return redirect(url_for('submit_payment', token=token))
                
                # Create Stripe charge with billing address for AVS
                charge = stripe.Charge.create(
                    amount=int(amount * 100),  # Stripe uses cents
                    currency='usd',
                    payment_method=payment_method,
                    confirm=True,
                    description=f'Rent payment for {tenant.property_address}',
                    metadata={
                        'tenant_id': str(tenant.id),
                        'property_address': tenant.property_address,
                        'payment_type': 'rent'
                    },
                    # Billing details for AVS verification
                    billing_details={
                        'address': {
                            'line1': billing_address['line1'],
                            'city': billing_address['city'],
                            'state': billing_address['state'],
                            'postal_code': billing_address['postal_code'],
                            'country': billing_address['country']
                        }
                    },
                    # Expand to get AVS details
                    expand=['payment_method_details.card.three_d_secure']
                )
                
                # Check AVS result
                avs_result = charge.payment_method_details.card.address_line1_check
                avs_postal = charge.payment_method_details.card.address_postal_code_check
                
                # Determine AVS status
                avs_status = 'verified'
                if avs_result == 'fail' or avs_postal == 'fail':
                    avs_status = 'failed'
                    flash('Warning: Address verification failed. Payment may be declined by your bank.', 'warning')
                elif avs_result == 'unavailable' or avs_postal == 'unavailable':
                    avs_status = 'unavailable'
                
                # Record payment in database with AVS info
                payment = Payment(
                    tenant_id=tenant.id,
                    amount_paid=amount,
                    payment_date=datetime.now(),
                    for_month=date.today().strftime('%Y-%m'),
                    payment_method='Stripe',
                    notes=f'Stripe charge: {charge.id} | AVS: {avs_status} | Line1: {avs_result} | ZIP: {avs_postal}'
                )
                db_session.add(payment)
                db_session.commit()
                
                # Notify landlord (optional - could send email)
                flash('Payment successful! Thank you.', 'success')
                return redirect(url_for('tenant_portal_home', token=token))
                
            except stripe.error.CardError as e:
                # Handle specific Stripe error codes
                error_code = getattr(e, 'code', 'unknown')
                if error_code == 'address_line1_incomplete':
                    flash('Billing address is incomplete. Please check and try again.', 'error')
                elif error_code == 'postal_code_invalid':
                    flash('ZIP code is invalid. Please check and try again.', 'error')
                elif error_code == 'address_unverified':
                    flash('Address could not be verified. Please use the exact billing address from your card statement.', 'error')
                else:
                    flash(f'Payment failed: {str(e)}', 'error')
            except stripe.error.StripeError as e:
                flash(f'Payment error: {str(e)}', 'error')
            except Exception as e:
                flash(f'Payment error: {str(e)}', 'error')
        
        # GET request - show payment form
        amount_due = tenant.monthly_rent
        current_month = date.today().strftime('%Y-%m')
        current_payment = db_session.query(Payment).filter_by(
            tenant_id=tenant.id, 
            for_month=current_month
        ).first()
        
        if current_payment:
            amount_due = max(0, tenant.monthly_rent - current_payment.amount_paid)
        
        return render_template('tenant_payment.html',
                             tenant=tenant,
                             amount_due=amount_due,
                             token=token,
                             stripe_publishable_key=request.app.config.get('STRIPE_PUBLISHABLE_KEY'))
    finally:
        db_session.close()


@tenant_portal.route('/portal/<token>/maintenance', methods=['GET', 'POST'])
def submit_maintenance(token):
    """Submit maintenance request"""
    db_session = get_db_session()
    try:
        tenant = db_session.query(Tenant).filter_by(portal_token=token, portal_enabled=True).first()
        
        if not tenant:
            flash('Invalid portal link', 'error')
            return redirect(url_for('login'))
        
        if request.method == 'POST':
            title = request.form.get('title')
            description = request.form.get('description')
            urgency = request.form.get('urgency', 'normal')
            
            if not title or not description:
                flash('Please fill in all required fields', 'error')
            else:
                # Create maintenance request
                maintenance = MaintenanceRequest(
                    tenant_id=tenant.id,
                    property_id=tenant.property_id if hasattr(tenant, 'property_id') else None,
                    title=title,
                    description=description,
                    urgency=urgency,
                    status='open',
                    created_at=datetime.now()
                )
                db_session.add(maintenance)
                db_session.commit()
                
                # Notify landlord (send email or create notification)
                # TODO: Implement email notification to landlord
                
                flash('Maintenance request submitted successfully!', 'success')
                return redirect(url_for('tenant_portal_home', token=token))
        
        return render_template('tenant_maintenance.html',
                             tenant=tenant,
                             token=token)
    finally:
        db_session.close()


@tenant_portal.route('/portal/<token>/message', methods=['GET', 'POST'])
def send_message(token):
    """Send message to landlord - stores as maintenance request with message flag"""
    db_session = get_db_session()
    try:
        tenant = db_session.query(Tenant).filter_by(portal_token=token, portal_enabled=True).first()
        
        if not tenant:
            flash('Invalid portal link', 'error')
            return redirect(url_for('login'))
        
        if request.method == 'POST':
            subject = request.form.get('subject')
            message_text = request.form.get('message')
            
            if not subject or not message_text:
                flash('Please fill in all fields', 'error')
            else:
                # Store as maintenance request with type='message'
                msg_request = MaintenanceRequest(
                    tenant_id=tenant.id,
                    property_id=tenant.property_id if hasattr(tenant, 'property_id') else None,
                    title=f'Message: {subject}',
                    description=message_text,
                    urgency='normal',
                    status='open',
                    created_at=datetime.now(),
                    is_message=True  # Flag to distinguish from actual maintenance
                )
                db_session.add(msg_request)
                db_session.commit()
                
                flash('Message sent to landlord!', 'success')
                return redirect(url_for('tenant_portal_home', token=token))
        
        return render_template('tenant_message.html',
                             tenant=tenant,
                             token=token)
    finally:
        db_session.close()


@tenant_portal.route('/portal/<token>/history')
def payment_history(token):
    """View full payment history"""
    db_session = get_db_session()
    try:
        tenant = db_session.query(Tenant).filter_by(portal_token=token, portal_enabled=True).first()
        
        if not tenant:
            flash('Invalid portal link', 'error')
            return redirect(url_for('login'))
        
        payments = db_session.query(Payment).filter_by(tenant_id=tenant.id).order_by(Payment.payment_date.desc()).all()
        
        return render_template('tenant_history.html',
                             tenant=tenant,
                             payments=payments,
                             token=token)
    finally:
        db_session.close()
