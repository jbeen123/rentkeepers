from flask import Flask, render_template, request, redirect, url_for, flash, send_file, jsonify, session, abort
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_mail import Mail, Message
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from models import init_db, get_db_session, User, Tenant, Payment, Invoice, AuditLog, Property, log_action
from owner_statements import init_owner_statement_routes
from payment_processing import init_payment_routes
from datetime import datetime, date, timedelta
from functools import wraps
import calendar
import csv
import io
import os
import json
import stripe
import secrets
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY')

# Configure session cookie for cross-origin
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
# Use HTTPS only in production, HTTP in development
is_development = os.getenv('FLASK_ENV') == 'development' or os.getenv('FLASK_DEBUG') == '1'
app.config['SESSION_COOKIE_SECURE'] = not is_development  # HTTPS only in production

# Enable CORS for React frontend (includes HTTPS for local dev)
CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://localhost:5173", "https://127.0.0.1:5173"])

if not app.secret_key:
    raise ValueError("SECRET_KEY must be set in .env file")

# Stripe setup
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')
STRIPE_PRICE_MONTHLY = os.getenv('STRIPE_PRICE_MONTHLY')
STRIPE_PRICE_YEARLY = os.getenv('STRIPE_PRICE_YEARLY')

# Flask-Login setup
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Please log in to access this page.'

# Flask-Mail setup
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'true').lower() == 'true'
app.config['MAIL_USE_SSL'] = os.getenv('MAIL_USE_SSL', 'false').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME', '')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD', '')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'rentkeepers@example.com')

mail = Mail(app)

# Initialize Owner Statement routes
init_owner_statement_routes(app, mail)
init_payment_routes(app)

# Rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

# Initialize database on startup
init_db()

@login_manager.user_loader
def load_user(user_id):
    db = get_db_session()
    user = db.query(User).get(int(user_id))
    db.close()
    return user

# ============== EMAIL FUNCTIONS ==============

def send_email(to, subject, body, html_body=None):
    """Send email with error handling"""
    if not app.config['MAIL_USERNAME']:
        print(f"[EMAIL] Would send to {to}: {subject}")
        return False
    
    try:
        msg = Message(
            subject=subject,
            recipients=[to],
            body=body,
            html=html_body
        )
        mail.send(msg)
        print(f"[EMAIL] Sent to {to}: {subject}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send to {to}: {e}")
        return False

def send_tenant_invite(tenant, portal_url):
    """Send portal access email to tenant"""
    body = f"""Hi {tenant.name},

Your landlord has invited you to RentKeepers tenant portal.

You can view your rent status and make payments here:
{portal_url}

This link is unique to you. Keep it private.

---
RentKeepers Tenant Portal
"""
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to RentKeepers Tenant Portal</h2>
        <p>Hi {tenant.name},</p>
        <p>Your landlord has invited you to access your rent information online.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{portal_url}" style="background: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Access Your Portal</a>
        </div>
        <p style="color: #666; font-size: 14px;">Or copy this link: {portal_url}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">This link is unique to you. Keep it private.</p>
    </body>
    </html>
    """
    
    return send_email(tenant.email, "Your RentKeepers Tenant Portal", body, html)

def send_rent_reminder_email(user, tenant, due_date, days_until):
    """Send rent reminder to landlord"""
    status = "overdue" if days_until < 0 else f"due in {days_until} days"
    
    body = f"""Hi {user.first_name or 'Landlord'},

This is a reminder that rent is {status} for:

Tenant: {tenant.name}
Property: {tenant.property_address}
Amount: ${tenant.monthly_rent:.2f}
Due Date: {due_date.strftime('%B %d, %Y')}

Log in to RentKeepers to record the payment or send a reminder to your tenant.

---
RentKeepers
"""
    
    return send_email(user.email, f"Rent {status.title()} - {tenant.name}", body)

def send_tenant_payment_confirmation(tenant, payment, landlord_name):
    """Send receipt to tenant after payment"""
    body = f"""Hi {tenant.name},

Your rent payment has been recorded:

Amount: ${payment.amount_paid:.2f}
For: {payment.for_month}
Property: {tenant.property_address}
Date: {payment.payment_date.strftime('%B %d, %Y')}
Method: {payment.payment_method}

Thank you!

---
{landlord_name} via RentKeepers
"""
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">✓ Payment Recorded</h2>
        <p>Hi {tenant.name},</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Amount:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${payment.amount_paid:.2f}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>For:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{payment.for_month}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Date:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{payment.payment_date.strftime('%B %d, %Y')}</td></tr>
            <tr><td style="padding: 8px;"><strong>Method:</strong></td><td style="padding: 8px;">{payment.payment_method}</td></tr>
        </table>
        <p>Thank you!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">{landlord_name} via RentKeepers</p>
    </body>
    </html>
    """
    
    return send_email(tenant.email, f"Rent Payment Confirmed - {payment.for_month}", body, html)

# ============== SCHEDULER ==============

scheduler = BackgroundScheduler()

def check_and_send_reminders():
    """Check for rent due dates and send reminders"""
    db = get_db_session()
    
    try:
        today = date.today()
        current_month = today.strftime('%Y-%m')
        
        # Get all users with reminders enabled
        users = db.query(User).filter_by(reminder_enabled=True).all()
        
        for user in users:
            if not user.email:
                continue
            
            # Get user's tenants
            tenants = db.query(Tenant).filter_by(user_id=user.id).all()
            
            for tenant in tenants:
                # Calculate due date
                due_day = min(tenant.due_day, calendar.monthrange(today.year, today.month)[1])
                due_date = date(today.year, today.month, due_day)
                days_until_due = (due_date - today).days
                
                # Check if payment already received
                payment = db.query(Payment).filter(
                    Payment.tenant_id == tenant.id,
                    Payment.for_month == current_month
                ).first()
                
                if payment:
                    continue
                
                # Send reminder if within the window
                if days_until_due == user.reminder_days_before:
                    # Days before due
                    send_rent_reminder_email(user, tenant, due_date, days_until_due)
                    log_action(user.id, 'REMINDER_SENT', 'tenant', tenant.id, 
                              f"Reminder sent {days_until_due} days before due date")
                    
                elif days_until_due == 0:
                    # Due today
                    send_rent_reminder_email(user, tenant, due_date, 0)
                    log_action(user.id, 'REMINDER_SENT', 'tenant', tenant.id, "Due today reminder")
                    
                elif days_until_due == -3:
                    # 3 days late
                    send_rent_reminder_email(user, tenant, due_date, days_until_due)
                    log_action(user.id, 'REMINDER_SENT', 'tenant', tenant.id, "Late payment reminder")
                    
    finally:
        db.close()

# Schedule reminders to run daily at 9 AM
scheduler.add_job(check_and_send_reminders, 'cron', hour=9, minute=0)
scheduler.start()

# Template filters
@app.template_filter('month_name')
def month_name_filter(month_str):
    if month_str and len(month_str) == 7:
        year, month = month_str.split('-')
        return datetime(int(year), int(month), 1).strftime('%B %Y')
    return month_str

# ============== AUTH ROUTES ==============

@app.route('/register', methods=['GET', 'POST'])
@limiter.limit("5 per minute")
def register():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        first_name = request.form.get('first_name', '').strip()
        
        if not email or not password:
            flash('Email and password are required.', 'danger')
            return redirect(url_for('register'))
        
        if len(password) < 6:
            flash('Password must be at least 6 characters.', 'danger')
            return redirect(url_for('register'))
        
        db = get_db_session()
        try:
            existing = db.query(User).filter_by(email=email).first()
            if existing:
                flash('Email already registered. Please log in.', 'danger')
                db.close()
                return redirect(url_for('login'))
            
            user = User(email=email, first_name=first_name)
            user.set_password(password)
            db.add(user)
            db.commit()
            
            log_action(user.id, 'USER_REGISTERED', ip_address=request.remote_addr)
            
            flash('Account created! Please log in.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            db.rollback()
            flash('Error creating account. Please try again.', 'danger')
        finally:
            db.close()
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
@limiter.limit("10 per minute")
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        remember = request.form.get('remember', False)
        
        db = get_db_session()
        user = db.query(User).filter_by(email=email).first()
        db.close()
        
        if user and user.check_password(password):
            # Check if 2FA is enabled
            if user.totp_enabled:
                # Store user ID in session for 2FA verification
                session['2fa_user_id'] = user.id
                session['2fa_remember'] = remember
                return redirect(url_for('verify_2fa'))
            
            login_user(user, remember=remember)
            log_action(user.id, 'LOGIN', ip_address=request.remote_addr)
            next_page = request.args.get('next')
            flash(f'Welcome back{", " + user.first_name if user.first_name else ""}!', 'success')
            return redirect(next_page or url_for('dashboard'))
        else:
            flash('Invalid email or password.', 'danger')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    log_action(current_user.id, 'LOGOUT', ip_address=request.remote_addr)
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

# ============== 2FA ROUTES ==============

@app.route('/verify-2fa', methods=['GET', 'POST'])
def verify_2fa():
    """Verify TOTP code during login"""
    user_id = session.get('2fa_user_id')
    if not user_id:
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        token = request.form.get('token', '').replace(' ', '')
        
        db = get_db_session()
        user = db.query(User).get(user_id)
        
        if user and user.verify_totp(token):
            # Clear 2FA session
            remember = session.pop('2fa_remember', False)
            session.pop('2fa_user_id', None)
            
            login_user(user, remember=remember)
            user.totp_verified_at = datetime.utcnow()
            db.commit()
            db.close()
            
            log_action(user.id, 'LOGIN_2FA', ip_address=request.remote_addr)
            flash('Welcome back! 2FA verified.', 'success')
            return redirect(url_for('dashboard'))
        else:
            db.close()
            flash('Invalid verification code. Please try again.', 'danger')
    
    return render_template('verify_2fa.html')

@app.route('/setup-2fa', methods=['GET', 'POST'])
@login_required
def setup_2fa():
    """Set up TOTP 2FA"""
    db = get_db_session()
    user = db.query(User).get(current_user.id)
    
    if request.method == 'POST':
        token = request.form.get('token', '').replace(' ', '')
        
        # Verify the token
        if user.verify_totp(token):
            user.totp_enabled = True
            user.totp_verified_at = datetime.utcnow()
            db.commit()
            db.close()
            
            log_action(user.id, '2FA_ENABLED', ip_address=request.remote_addr)
            flash('Two-factor authentication has been enabled!', 'success')
            return redirect(url_for('settings'))
        else:
            db.close()
            flash('Invalid verification code. Please try again.', 'danger')
            return redirect(url_for('setup_2fa'))
    
    # Generate new secret if not exists
    if not user.totp_secret:
        user.generate_totp_secret()
        db.commit()
    
    # Generate QR code
    import qrcode
    import qrcode.image.svg
    import io
    import base64
    
    totp_uri = user.get_totp_uri()
    qr = qrcode.make(totp_uri, image_factory=qrcode.image.svg.SvgImage)
    buffer = io.BytesIO()
    qr.save(buffer)
    qr_b64 = base64.b64encode(buffer.getvalue()).decode()
    
    db.close()
    
    return render_template('setup_2fa.html', 
                          secret=user.totp_secret,
                          qr_code=qr_b64)

@app.route('/disable-2fa', methods=['POST'])
@login_required
def disable_2fa():
    """Disable TOTP 2FA"""
    db = get_db_session()
    user = db.query(User).get(current_user.id)
    
    password = request.form.get('password', '')
    
    if not user.check_password(password):
        db.close()
        flash('Incorrect password.', 'danger')
        return redirect(url_for('settings'))
    
    user.totp_enabled = False
    user.totp_secret = None
    user.totp_verified_at = None
    db.commit()
    db.close()
    
    log_action(user.id, '2FA_DISABLED', ip_address=request.remote_addr)
    flash('Two-factor authentication has been disabled.', 'info')
    return redirect(url_for('settings'))

# ============== TENANT PORTAL ROUTES ==============

@app.route('/portal/<token>')
def tenant_portal(token):
    """Tenant-facing portal - no login required, token-based auth"""
    db = get_db_session()
    tenant = db.query(Tenant).filter_by(portal_token=token, portal_enabled=True).first()
    
    if not tenant:
        abort(404, "Invalid or expired portal link")
    
    # Get payment history
    payments = db.query(Payment).filter_by(tenant_id=tenant.id).order_by(Payment.payment_date.desc()).all()
    
    # Calculate current month status
    today = date.today()
    current_month = today.strftime('%Y-%m')
    current_payment = next((p for p in payments if p.for_month == current_month), None)
    
    # Calculate amount due
    amount_due = tenant.monthly_rent
    if current_payment:
        amount_due = max(0, tenant.monthly_rent - current_payment.amount_paid)
    
    # Determine status
    if amount_due == 0:
        status = 'paid'
    elif today.day > tenant.due_day:
        status = 'late'
    else:
        status = 'pending'
    
    # Calculate next due date
    due_day = min(tenant.due_day, calendar.monthrange(today.year, today.month)[1])
    due_date = date(today.year, today.month, due_day)
    if due_date < today and status != 'paid':
        # Next month
        next_month = today.replace(day=1) + timedelta(days=32)
        next_due_day = min(tenant.due_day, calendar.monthrange(next_month.year, next_month.month)[1])
        due_date = date(next_month.year, next_month.month, next_due_day)
    
    db.close()
    
    return render_template('tenant_portal.html',
                         tenant=tenant,
                         payments=payments[:12],  # Last 12 payments
                         status=status,
                         amount_due=amount_due,
                         due_date=due_date,
                         current_month=current_month)

# ============== LANDLORD ROUTES ==============

@app.route('/tenants/<int:tenant_id>/enable-portal', methods=['POST'])
@login_required
def enable_tenant_portal(tenant_id):
    """Generate portal token for tenant"""
    db = get_db_session()
    tenant = db.query(Tenant).filter_by(id=tenant_id, user_id=current_user.id).first()
    
    if not tenant:
        flash('Tenant not found.', 'danger')
        db.close()
        return redirect(url_for('list_tenants'))
    
    if not tenant.email:
        flash('Tenant needs an email address for portal access.', 'warning')
        db.close()
        return redirect(url_for('edit_tenant', tenant_id=tenant_id))
    
    # Generate unique token
    tenant.portal_token = secrets.token_urlsafe(32)
    tenant.portal_enabled = True
    db.commit()
    
    # Send email to tenant
    portal_url = url_for('tenant_portal', token=tenant.portal_token, _external=True)
    
    if send_tenant_invite(tenant, portal_url):
        flash(f'Portal access sent to {tenant.email}!', 'success')
        log_action(current_user.id, 'PORTAL_ENABLED', 'tenant', tenant.id, 
                  f"Portal enabled for {tenant.name}", request.remote_addr)
    else:
        flash(f'Portal enabled but email failed. Share this link: {portal_url}', 'warning')
    
    db.close()
    return redirect(url_for('edit_tenant', tenant_id=tenant_id))

@app.route('/tenants/<int:tenant_id>/disable-portal', methods=['POST'])
@login_required
def disable_tenant_portal(tenant_id):
    """Revoke portal access"""
    db = get_db_session()
    tenant = db.query(Tenant).filter_by(id=tenant_id, user_id=current_user.id).first()
    
    if tenant:
        tenant.portal_enabled = False
        tenant.portal_token = None
        db.commit()
        flash(f'Portal access revoked for {tenant.name}.', 'info')
        log_action(current_user.id, 'PORTAL_DISABLED', 'tenant', tenant.id)
    
    db.close()
    return redirect(url_for('edit_tenant', tenant_id=tenant_id))

# ============== SUBSCRIPTION ROUTES ==============

@app.route('/pricing')
def pricing():
    return render_template('pricing.html',
                         monthly_price='$9',
                         yearly_price='$79',
                         lifetime_price='$149')

@app.route('/checkout', methods=['POST'])
@login_required
def checkout():
    tier = request.form.get('tier', 'monthly')
    
    if not STRIPE_PRICE_MONTHLY or not STRIPE_PRICE_YEARLY:
        flash('Stripe not configured. Contact support.', 'danger')
        return redirect(url_for('pricing'))
    
    price_id = STRIPE_PRICE_MONTHLY if tier == 'monthly' else STRIPE_PRICE_YEARLY
    
    try:
        # Build metadata from env vars + user info
        checkout_metadata = {
            'user_id': current_user.id,
            'app': os.getenv('STRIPE_METADATA_APP', 'rentkeepers'),
            'version': os.getenv('STRIPE_METADATA_VERSION', '1.0'),
            'tier': tier
        }
        
        checkout_session = stripe.checkout.Session.create(
            customer_email=current_user.email,
            line_items=[{"price": price_id, "quantity": 1}],
            mode='subscription',
            success_url=url_for('payment_success', _external=True) + '?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=url_for('pricing', _external=True),
            metadata=checkout_metadata,
            subscription_data={
                'metadata': checkout_metadata
            }
        )
        return redirect(checkout_session.url)
    except Exception as e:
        flash(f'Error creating checkout: {str(e)}', 'danger')
        return redirect(url_for('pricing'))

# ============== CRYPTO PAYMENT ROUTES ==============

CRYPTO_WALLETS = {
    'btc': os.getenv('BTC_WALLET', 'your_btc_address'),
    'eth': os.getenv('ETH_WALLET', 'your_eth_address'),
    'usdc': os.getenv('USDC_WALLET', 'your_usdc_address')
}

CRYPTO_PRICES = {
    'monthly': {'usd': 9.00, 'btc': 0.00015, 'eth': 0.003, 'usdc': 9.00},
    'yearly': {'usd': 79.00, 'btc': 0.0013, 'eth': 0.026, 'usdc': 79.00}
}

@app.route('/payment')
@login_required
def payment():
    tier = request.args.get('tier', 'monthly')
    price_usd = '$9' if tier == 'monthly' else '$79'
    
    return render_template('payment.html',
                         tier=tier,
                         price_usd=price_usd,
                         wallet_btc=CRYPTO_WALLETS['btc'],
                         wallet_eth=CRYPTO_WALLETS['eth'],
                         wallet_usdc=CRYPTO_WALLETS['usdc'],
                         crypto_amount_btc=CRYPTO_PRICES[tier]['btc'],
                         crypto_amount_eth=CRYPTO_PRICES[tier]['eth'],
                         crypto_amount_usdc=CRYPTO_PRICES[tier]['usdc'])

@app.route('/payment/crypto', methods=['POST'])
@login_required
def crypto_payment_submit():
    tier = request.form.get('tier', 'monthly')
    tx_hash = request.form.get('tx_hash', '').strip()
    currency = request.form.get('currency', 'USDC')
    
    if not tx_hash:
        flash('Please provide transaction hash.', 'danger')
        return redirect(url_for('payment', tier=tier))
    
    db = get_db_session()
    try:
        # Create pending payment record
        user = db.query(User).get(current_user.id)
        user.pending_crypto_tx = tx_hash
        user.pending_crypto_amount = CRYPTO_PRICES[tier]['usd']
        user.pending_crypto_currency = currency
        db.commit()
        
        flash('Payment submitted! We\'ll activate your account once confirmed.', 'success')
        log_action(current_user.id, 'CRYPTO_PAYMENT_SUBMITTED', 
                  details=f'Tier: {tier}, Amount: ${CRYPTO_PRICES[tier]["usd"]}, TX: {tx_hash}')
    except Exception as e:
        flash(f'Error recording payment: {str(e)}', 'danger')
    finally:
        db.close()
    
    return redirect(url_for('dashboard'))

@app.route('/payment-success')
@login_required
def payment_success():
    session_id = request.args.get('session_id')
    if session_id:
        try:
            checkout_session = stripe.checkout.Session.retrieve(session_id)
            
            db = get_db_session()
            user = db.query(User).get(current_user.id)
            user.stripe_customer_id = checkout_session.customer
            user.stripe_subscription_id = checkout_session.subscription
            user.subscription_tier = 'monthly'
            user.subscription_status = 'active'
            db.commit()
            db.close()
            
            flash('Payment successful! Your account is now premium.', 'success')
            log_action(current_user.id, 'SUBSCRIPTION_STARTED', details=f'Tier: {user.subscription_tier}')
        except Exception as e:
            flash(f'Error activating subscription: {str(e)}', 'danger')
    
    return redirect(url_for('dashboard'))

@app.route('/webhook/stripe', methods=['POST'])
def stripe_webhook():
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except:
        return jsonify({'error': 'Invalid signature'}), 400
    
    if event['type'] == 'invoice.payment_failed':
        subscription = event['data']['object']
        user_id = subscription.get('metadata', {}).get('user_id')
        if user_id:
            db = get_db_session()
            user = db.query(User).get(int(user_id))
            if user:
                user.subscription_status = 'past_due'
                db.commit()
            db.close()
    
    return jsonify({'status': 'success'}), 200

# ============== MAIN APP ROUTES ==============

@app.route('/')
@login_required
def dashboard():
    db = get_db_session()
    
    today = date.today()
    current_month = today.strftime('%Y-%m')
    
    tenants = db.query(Tenant).filter_by(user_id=current_user.id).all()
    
    tenant_status = []
    total_expected = 0
    total_collected = 0
    
    for tenant in tenants:
        total_expected += tenant.monthly_rent
        
        payment = db.query(Payment).filter(
            Payment.tenant_id == tenant.id,
            Payment.for_month == current_month
        ).first()
        
        if payment:
            status = 'paid'
            total_collected += payment.amount_paid
        elif today.day > tenant.due_day:
            status = 'late'
        else:
            status = 'pending'
            
        tenant_status.append({
            'tenant': tenant,
            'status': status,
            'payment': payment
        })
    
    db.close()
    
    return render_template('dashboard.html',
                         tenant_status=tenant_status,
                         current_month=current_month,
                         total_expected=total_expected,
                         total_collected=total_collected)

@app.route('/tenants')
@login_required
def list_tenants():
    db = get_db_session()
    tenants = db.query(Tenant).filter_by(user_id=current_user.id).all()
    tenant_count = db.query(Tenant).filter_by(user_id=current_user.id).count()
    can_add = tenant_count < current_user.max_tenants
    db.close()
    
    return render_template('tenants.html', tenants=tenants, can_add=can_add)

@app.route('/tenants/add', methods=['POST'])
@login_required
def add_tenant():
    db = get_db_session()
    
    # Check tenant limit with open session
    tenant_count = db.query(Tenant).filter_by(user_id=current_user.id).count()
    if tenant_count >= current_user.max_tenants:
        db.close()
        flash('Upgrade to Premium for unlimited tenants!', 'warning')
        return redirect(url_for('pricing'))
    
    try:
        tenant = Tenant(
            user_id=current_user.id,
            name=request.form['name'],
            property_address=request.form['property_address'],
            monthly_rent=float(request.form['monthly_rent']),
            due_day=int(request.form['due_day']),
            phone=request.form.get('phone', ''),
            email=request.form.get('email', ''),
            lease_start=request.form.get('lease_start') or None,
            lease_end=request.form.get('lease_end') or None,
            security_deposit=float(request.form.get('security_deposit', 0))
        )
        db.add(tenant)
        db.commit()
        
        log_action(current_user.id, 'TENANT_ADDED', 'tenant', tenant.id, 
                  f"Added tenant: {tenant.name}", request.remote_addr)
        
        flash(f'Tenant "{tenant.name}" added successfully!', 'success')
    except Exception as e:
        db.rollback()
        flash(f'Error adding tenant: {str(e)}', 'danger')
    finally:
        db.close()
    
    return redirect(url_for('list_tenants'))

@app.route('/tenants/<int:tenant_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_tenant(tenant_id):
    db = get_db_session()
    tenant = db.query(Tenant).filter_by(id=tenant_id, user_id=current_user.id).first()
    
    if not tenant:
        flash('Tenant not found', 'danger')
        db.close()
        return redirect(url_for('list_tenants'))
    
    if request.method == 'POST':
        try:
            tenant.name = request.form['name']
            tenant.property_address = request.form['property_address']
            tenant.monthly_rent = float(request.form['monthly_rent'])
            tenant.due_day = int(request.form['due_day'])
            tenant.phone = request.form.get('phone', '')
            tenant.email = request.form.get('email', '')
            tenant.lease_start = request.form.get('lease_start') or None
            tenant.lease_end = request.form.get('lease_end') or None
            tenant.security_deposit = float(request.form.get('security_deposit', 0))
            db.commit()
            flash(f'Tenant "{tenant.name}" updated!', 'success')
            log_action(current_user.id, 'TENANT_UPDATED', 'tenant', tenant.id)
        except Exception as e:
            db.rollback()
            flash(f'Error updating tenant: {str(e)}', 'danger')
        finally:
            db.close()
        return redirect(url_for('list_tenants'))
    
    db.close()
    return render_template('edit_tenant.html', tenant=tenant)

@app.route('/tenants/<int:tenant_id>/delete', methods=['POST'])
@login_required
def delete_tenant(tenant_id):
    db = get_db_session()
    tenant = db.query(Tenant).filter_by(id=tenant_id, user_id=current_user.id).first()
    
    if tenant:
        name = tenant.name
        db.delete(tenant)
        db.commit()
        flash(f'Tenant "{name}" deleted.', 'warning')
        log_action(current_user.id, 'TENANT_DELETED', details=f"Deleted: {name}")
    else:
        flash('Tenant not found', 'danger')
    
    db.close()
    return redirect(url_for('list_tenants'))

# Property Management Routes
@app.route('/properties')
@login_required
def list_properties():
    db = get_db_session()
    properties = db.query(Property).filter_by(user_id=current_user.id).all()
    
    # Pre-calculate values to avoid session issues in template
    property_count = len(properties)
    max_properties = current_user.max_properties
    
    db.close()
    return render_template('properties.html', 
                         properties=properties,
                         property_count=property_count,
                         max_properties=max_properties)

@app.route('/properties/add', methods=['GET', 'POST'])
@login_required
def add_property():
    db = get_db_session()
    
    # Check property limit for free tier
    property_count = db.query(Property).filter_by(user_id=current_user.id).count()
    if property_count >= current_user.max_properties:
        db.close()
        flash('Upgrade to Premium for unlimited properties!', 'warning')
        return redirect(url_for('pricing'))
    
    if request.method == 'POST':
        try:
            property = Property(
                user_id=current_user.id,
                name=request.form['name'],
                address=request.form['address'],
                city=request.form.get('city', ''),
                state=request.form.get('state', ''),
                zip_code=request.form.get('zip_code', ''),
                property_type=request.form.get('property_type', 'single_family'),
                bedrooms=float(request.form.get('bedrooms', 0)) if request.form.get('bedrooms') else None,
                bathrooms=float(request.form.get('bathrooms', 0)) if request.form.get('bathrooms') else None,
                square_footage=int(request.form.get('square_footage', 0)) if request.form.get('square_footage') else None,
                year_built=int(request.form.get('year_built', 0)) if request.form.get('year_built') else None,
                purchase_price=float(request.form.get('purchase_price', 0)) if request.form.get('purchase_price') else None,
                property_tax=float(request.form.get('property_tax', 0)) if request.form.get('property_tax') else None,
                insurance_cost=float(request.form.get('insurance_cost', 0)) if request.form.get('insurance_cost') else None,
                maintenance_budget=float(request.form.get('maintenance_budget', 0)) if request.form.get('maintenance_budget') else None
            )
            db.add(property)
            db.commit()
            
            log_action(current_user.id, 'PROPERTY_ADDED', 'property', property.id,
                      f"Added property: {property.name}", request.remote_addr)
            
            flash(f'Property "{property.name}" added successfully!', 'success')
            db.close()
            return redirect(url_for('list_properties'))
        except Exception as e:
            db.rollback()
            flash(f'Error adding property: {str(e)}', 'danger')
    
    db.close()
    return render_template('add_property.html')

@app.route('/properties/<int:property_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_property(property_id):
    db = get_db_session()
    property = db.query(Property).filter_by(id=property_id, user_id=current_user.id).first()
    
    if not property:
        flash('Property not found', 'danger')
        db.close()
        return redirect(url_for('list_properties'))
    
    if request.method == 'POST':
        try:
            property.name = request.form['name']
            property.address = request.form['address']
            property.city = request.form.get('city', '')
            property.state = request.form.get('state', '')
            property.zip_code = request.form.get('zip_code', '')
            property.property_type = request.form.get('property_type', 'single_family')
            property.bedrooms = float(request.form.get('bedrooms', 0)) if request.form.get('bedrooms') else None
            property.bathrooms = float(request.form.get('bathrooms', 0)) if request.form.get('bathrooms') else None
            property.square_footage = int(request.form.get('square_footage', 0)) if request.form.get('square_footage') else None
            property.year_built = int(request.form.get('year_built', 0)) if request.form.get('year_built') else None
            property.purchase_price = float(request.form.get('purchase_price', 0)) if request.form.get('purchase_price') else None
            property.current_value = float(request.form.get('current_value', 0)) if request.form.get('current_value') else None
            property.property_tax = float(request.form.get('property_tax', 0)) if request.form.get('property_tax') else None
            property.insurance_cost = float(request.form.get('insurance_cost', 0)) if request.form.get('insurance_cost') else None
            property.maintenance_budget = float(request.form.get('maintenance_budget', 0)) if request.form.get('maintenance_budget') else None
            property.status = request.form.get('status', 'active')
            
            db.commit()
            log_action(current_user.id, 'PROPERTY_UPDATED', 'property', property.id,
                      f"Updated: {property.name}", request.remote_addr)
            flash(f'Property "{property.name}" updated!', 'success')
            db.close()
            return redirect(url_for('list_properties'))
        except Exception as e:
            db.rollback()
            flash(f'Error updating property: {str(e)}', 'danger')
    
    db.close()
    return render_template('edit_property.html', property=property)

@app.route('/properties/<int:property_id>/delete', methods=['POST'])
@login_required
def delete_property(property_id):
    db = get_db_session()
    property = db.query(Property).filter_by(id=property_id, user_id=current_user.id).first()
    
    if property:
        name = property.name
        db.delete(property)
        db.commit()
        flash(f'Property "{name}" deleted.', 'warning')
        log_action(current_user.id, 'PROPERTY_DELETED', details=f"Deleted: {name}")
    else:
        flash('Property not found', 'danger')
    
    db.close()
    return redirect(url_for('list_properties'))

@app.route('/payments')
@login_required
def payments():
    db = get_db_session()
    tenants = db.query(Tenant).filter_by(user_id=current_user.id).all()
    
    payment_history = db.query(Payment, Tenant).join(Tenant).filter(
        Payment.user_id == current_user.id
    ).order_by(
        Payment.payment_date.desc()
    ).limit(30).all()
    
    current_month = date.today().strftime('%Y-%m')
    
    db.close()
    return render_template('payments.html', 
                         tenants=tenants, 
                         payment_history=payment_history,
                         current_month=current_month)

@app.route('/payments/add', methods=['POST'])
@login_required
def add_payment():
    db = get_db_session()
    
    tenant_id = int(request.form['tenant_id'])
    tenant = db.query(Tenant).filter_by(id=tenant_id, user_id=current_user.id).first()
    
    if not tenant:
        flash('Invalid tenant.', 'danger')
        db.close()
        return redirect(url_for('payments'))
    
    try:
        payment = Payment(
            tenant_id=tenant_id,
            user_id=current_user.id,
            amount_paid=float(request.form['amount_paid']),
            for_month=request.form['for_month'],
            payment_method=request.form.get('payment_method', 'Cash'),
            notes=request.form.get('notes', '')
        )
        db.add(payment)
        db.commit()
        
        # Send confirmation email to tenant
        if tenant.email and tenant.portal_enabled:
            send_tenant_payment_confirmation(tenant, payment, current_user.first_name or 'Your Landlord')
        
        flash('Payment logged successfully!', 'success')
        log_action(current_user.id, 'PAYMENT_ADDED', 'payment', payment.id,
                  f"${payment.amount_paid} for {tenant.name}", request.remote_addr)
    except Exception as e:
        db.rollback()
        flash(f'Error logging payment: {str(e)}', 'danger')
    finally:
        db.close()
    
    return redirect(url_for('payments'))

# ============== EXPORT/IMPORT ==============

@app.route('/export')
@login_required
def export_csv():
    db = get_db_session()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(['Tenant', 'Property', 'Phone', 'Email', 'Monthly Rent', 'Due Day',
                     'Payment Month', 'Amount Paid', 'Payment Date', 'Method', 'Notes'])
    
    tenants = db.query(Tenant).filter_by(user_id=current_user.id).all()
    for tenant in tenants:
        if tenant.payments:
            for payment in tenant.payments:
                writer.writerow([
                    tenant.name, tenant.property_address, tenant.phone, tenant.email,
                    tenant.monthly_rent, tenant.due_day, payment.for_month,
                    payment.amount_paid, payment.payment_date.strftime('%Y-%m-%d'),
                    payment.payment_method, payment.notes
                ])
        else:
            writer.writerow([
                tenant.name, tenant.property_address, tenant.phone, tenant.email,
                tenant.monthly_rent, tenant.due_day, 'No payments', '', '', '', ''
            ])
    
    db.close()
    
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode()),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'rentkeepers_export_{date.today()}.csv'
    )

@app.route('/import', methods=['POST'])
@login_required
def import_csv():
    if 'csv_file' not in request.files:
        flash('No file uploaded.', 'danger')
        return redirect(url_for('settings'))
    
    file = request.files['csv_file']
    if file.filename == '':
        flash('No file selected.', 'danger')
        return redirect(url_for('settings'))
    
    if not file.filename.endswith('.csv'):
        flash('Please upload a CSV file.', 'danger')
        return redirect(url_for('settings'))
    
    try:
        stream = io.StringIO(file.stream.read().decode("UTF8"))
        reader = csv.DictReader(stream)
        
        db = get_db_session()
        imported = 0
        
        tenant_count = db.query(Tenant).filter_by(user_id=current_user.id).count()
        
        for row in reader:
            if tenant_count >= current_user.max_tenants:
                flash(f'Imported {imported} tenants. Upgrade for more!', 'warning')
                break
            
            tenant = Tenant(
                user_id=current_user.id,
                name=row.get('Tenant', 'Unknown'),
                property_address=row.get('Property', ''),
                monthly_rent=float(row.get('Monthly Rent', 0)),
                due_day=int(row.get('Due Day', 1)),
                phone=row.get('Phone', ''),
                email=row.get('Email', '')
            )
            db.add(tenant)
            imported += 1
        
        db.commit()
        db.close()
        
        flash(f'Imported {imported} tenants successfully!', 'success')
        log_action(current_user.id, 'IMPORT_COMPLETE', details=f'Imported {imported} tenants')
    except Exception as e:
        flash(f'Error importing: {str(e)}', 'danger')
    
    return redirect(url_for('settings'))

# ============== SETTINGS ==============

@app.route('/settings', methods=['GET', 'POST'])
@login_required
def settings():
    db = get_db_session()
    user = db.query(User).get(current_user.id)
    
    if request.method == 'POST':
        user.email = request.form.get('email', user.email)
        user.first_name = request.form.get('first_name', user.first_name)
        user.reminder_enabled = 'reminder_enabled' in request.form
        user.reminder_days_before = int(request.form.get('reminder_days_before', 3))
        user.reminder_time = request.form.get('reminder_time', '09:00')
        
        new_password = request.form.get('new_password', '')
        if new_password:
            if len(new_password) >= 6:
                user.set_password(new_password)
                flash('Password updated!', 'success')
            else:
                flash('Password must be at least 6 characters.', 'danger')
                db.close()
                return redirect(url_for('settings'))
        
        try:
            db.commit()
            flash('Settings saved!', 'success')
            log_action(user.id, 'SETTINGS_UPDATED', ip_address=request.remote_addr)
        except Exception as e:
            db.rollback()
            flash('Error saving settings.', 'danger')
        finally:
            db.close()
        
        return redirect(url_for('settings'))
    
    db.close()
    return render_template('settings.html', user=user)

@app.route('/test-email')
@login_required
def test_email():
    if not app.config['MAIL_USERNAME']:
        flash('Email not configured.', 'warning')
        return redirect(url_for('settings'))
    
    if send_email(current_user.email, 'RentKeepers - Test Email',
                 f"Hi {current_user.first_name or 'there'},\n\nYour email is working!"):
        flash('Test email sent!', 'success')
    else:
        flash('Failed to send test email.', 'danger')
    
    return redirect(url_for('settings'))

# ============== MOBILE API ENDPOINTS ==============
# JSON endpoints for the React Native mobile app

@app.route('/api/login', methods=['POST'])
def api_login():
    """Login via API"""
    data = request.get_json()
    email = data.get('email', '').lower().strip()
    password = data.get('password', '')
    totp_code = data.get('totp_code')
    
    db = get_db_session()
    user = db.query(User).filter_by(email=email).first()
    
    if not user or not user.check_password(password):
        db.close()
        return jsonify({'error': 'Invalid email or password'}), 401
    
    if user.totp_enabled:
        if not totp_code:
            db.close()
            return jsonify({'needs_2fa': True}), 200
        if not user.verify_totp(totp_code):
            db.close()
            return jsonify({'error': 'Invalid 2FA code'}), 401
    
    login_user(user)
    log_action(user.id, 'login', 'User logged in via API')
    db.close()
    return jsonify({'user': {'id': user.id, 'email': user.email, 'first_name': user.first_name, 'is_admin': user.is_admin, 'totp_enabled': user.totp_enabled}}), 200

@app.route('/api/register', methods=['POST'])
def api_register():
    """Register via API"""
    data = request.get_json()
    email = data.get('email', '').lower().strip()
    password = data.get('password', '')
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    
    db = get_db_session()
    if db.query(User).filter_by(email=email).first():
        db.close()
        return jsonify({'error': 'Email already registered'}), 400
    
    user = User(email=email, first_name=first_name)
    user.set_password(password)
    db.add(user)
    db.commit()
    login_user(user)
    log_action(user.id, 'register', 'New user registered via API')
    db.close()
    return jsonify({'user': {'id': user.id, 'email': user.email, 'first_name': user.first_name, 'is_admin': user.is_admin, 'totp_enabled': user.totp_enabled}}), 201

@app.route('/api/logout', methods=['POST'])
@login_required
def api_logout():
    """Logout via API"""
    log_action(current_user.id, 'logout', 'User logged out via API')
    logout_user()
    return jsonify({'message': 'Logged out'}), 200

@app.route('/api/user')
@login_required
def api_current_user():
    """Get current user info for mobile app"""
    db = get_db_session()
    user = db.query(User).get(current_user.id)
    
    tenant_count = db.query(Tenant).filter_by(user_id=user.id).count()
    property_count = db.query(Property).filter_by(user_id=user.id).count()
    
    result = {
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'subscription_tier': user.subscription_tier,
        'subscription_display': user.subscription_display,
        'totp_enabled': user.totp_enabled,
        'max_tenants': user.max_tenants,
        'max_properties': user.max_properties,
        'tenant_count': tenant_count,
        'property_count': property_count
    }
    
    db.close()
    return jsonify(result)

@app.route('/api/dashboard')
@login_required
def api_dashboard():
    """Get dashboard stats for mobile app"""
    db = get_db_session()
    
    today = date.today()
    current_month = today.strftime('%Y-%m')
    
    tenants = db.query(Tenant).filter_by(user_id=current_user.id, is_active=True).all()
    
    stats = {
        'paid': 0,
        'pending': 0,
        'late': 0,
        'outstanding': 0.0,
        'total_monthly_rent': sum(t.monthly_rent for t in tenants)
    }
    
    tenant_statuses = []
    
    for tenant in tenants:
        # Check if paid for current month
        payment = db.query(Payment).filter(
            Payment.tenant_id == tenant.id,
            Payment.for_month == current_month
        ).first()
        
        due_day = min(tenant.due_day, calendar.monthrange(today.year, today.month)[1])
        days_until_due = due_day - today.day
        
        if payment and payment.amount_paid >= tenant.monthly_rent:
            status = 'paid'
            stats['paid'] += 1
        elif days_until_due < 0:
            status = 'late'
            stats['late'] += 1
            stats['outstanding'] += tenant.monthly_rent
        else:
            status = 'pending'
            stats['pending'] += 1
            stats['outstanding'] += tenant.monthly_rent
        
        tenant_statuses.append({
            'id': tenant.id,
            'name': tenant.name,
            'status': status,
            'monthly_rent': tenant.monthly_rent,
            'due_day': tenant.due_day
        })
    
    # Recent payments (last 5) - eager load tenant to avoid detached session
    from sqlalchemy.orm import joinedload
    recent_payments = db.query(Payment).options(
        joinedload(Payment.tenant)
    ).join(Tenant).filter(
        Tenant.user_id == current_user.id
    ).order_by(Payment.payment_date.desc()).limit(5).all()
    
    # Build payment data before closing session
    payment_data = [{
        'id': p.id,
        'tenant_name': p.tenant.name if p.tenant else 'Unknown',
        'amount': p.amount_paid,
        'date': p.payment_date.isoformat() if p.payment_date else None,
        'method': p.payment_method
    } for p in recent_payments]
    
    db.close()
    
    return jsonify({
        'stats': stats,
        'tenants': tenant_statuses,
        'recent_payments': payment_data
    })

@app.route('/api/tenants', methods=['GET', 'POST'])
@login_required
def api_tenants():
    """List or create tenants for mobile app"""
    db = get_db_session()
    
    if request.method == 'POST':
        data = request.get_json()
        
        # Check tenant limit
        tenant_count = db.query(Tenant).filter_by(user_id=current_user.id).count()
        if tenant_count >= current_user.max_tenants:
            db.close()
            return jsonify({'error': 'Tenant limit reached. Upgrade for more.'}), 403
        
        tenant = Tenant(
            user_id=current_user.id,
            name=data.get('name'),
            property_address=data.get('property_address', ''),
            monthly_rent=float(data.get('monthly_rent', 0)),
            due_day=int(data.get('due_day', 1)),
            phone=data.get('phone', ''),
            email=data.get('email', '')
        )
        
        try:
            db.add(tenant)
            db.commit()
            tenant_id = tenant.id
            db.close()
            
            log_action(current_user.id, 'TENANT_ADDED', 'tenant', tenant_id,
                      f"Added {tenant.name} via mobile API", request.remote_addr)
            
            return jsonify({
                'id': tenant_id,
                'message': 'Tenant added successfully'
            }), 201
        except Exception as e:
            db.rollback()
            db.close()
            return jsonify({'error': str(e)}), 500
    
    # GET - List tenants
    tenants = db.query(Tenant).filter_by(user_id=current_user.id).all()
    db.close()
    
    return jsonify([{
        'id': t.id,
        'name': t.name,
        'property_address': t.property_address,
        'monthly_rent': t.monthly_rent,
        'due_day': t.due_day,
        'phone': t.phone,
        'email': t.email,
        'is_active': t.is_active,
        'portal_enabled': t.portal_enabled
    } for t in tenants])

@app.route('/api/tenants/<int:tenant_id>')
@login_required
def api_tenant_detail(tenant_id):
    """Get single tenant with payment history"""
    db = get_db_session()
    
    tenant = db.query(Tenant).filter_by(id=tenant_id, user_id=current_user.id).first()
    if not tenant:
        db.close()
        return jsonify({'error': 'Tenant not found'}), 404
    
    payments = db.query(Payment).filter_by(tenant_id=tenant.id).order_by(Payment.payment_date.desc()).all()
    
    result = {
        'id': tenant.id,
        'name': tenant.name,
        'property_address': tenant.property_address,
        'monthly_rent': tenant.monthly_rent,
        'due_day': tenant.due_day,
        'phone': tenant.phone,
        'email': tenant.email,
        'is_active': tenant.is_active,
        'portal_enabled': tenant.portal_enabled,
        'payments': [{
            'id': p.id,
            'amount': p.amount_paid,
            'for_month': p.for_month,
            'date': p.payment_date.isoformat(),
            'method': p.payment_method,
            'notes': p.notes
        } for p in payments]
    }
    
    db.close()
    return jsonify(result)

@app.route('/api/payments', methods=['POST'])
@login_required
def api_add_payment():
    """Log a payment via mobile API"""
    data = request.get_json()
    
    db = get_db_session()
    
    tenant = db.query(Tenant).filter_by(
        id=data.get('tenant_id'),
        user_id=current_user.id
    ).first()
    
    if not tenant:
        db.close()
        return jsonify({'error': 'Tenant not found'}), 404
    
    try:
        payment = Payment(
            tenant_id=tenant.id,
            user_id=current_user.id,
            amount_paid=float(data.get('amount_paid', 0)),
            for_month=data.get('for_month', date.today().strftime('%Y-%m')),
            payment_method=data.get('payment_method', 'Other'),
            notes=data.get('notes', '')
        )
        
        db.add(payment)
        db.commit()
        payment_id = payment.id
        db.close()
        
        log_action(current_user.id, 'PAYMENT_ADDED', 'payment', payment_id,
                  f"${payment.amount_paid} via mobile API", request.remote_addr)
        
        return jsonify({
            'id': payment_id,
            'message': 'Payment logged successfully'
        }), 201
    except Exception as e:
        db.rollback()
        db.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/properties')
@login_required
def api_properties():
    """List properties for mobile app"""
    db = get_db_session()
    properties = db.query(Property).filter_by(user_id=current_user.id).all()
    db.close()
    
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'address': p.address,
        'status': p.status,
        'monthly_income': p.monthly_income,
        'occupancy_rate': p.occupancy_rate
    } for p in properties])


# ============== ADMIN ROUTES ==============

def admin_required(f):
    """Decorator to require admin access"""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            flash('Admin access required.', 'danger')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/admin')
@login_required
@admin_required
def admin_dashboard():
    """Admin dashboard"""
    db = get_db_session()
    
    stats = {
        'total_users': db.query(User).count(),
        'total_tenants': db.query(Tenant).count(),
        'total_payments': db.query(Payment).count(),
        'total_properties': db.query(Property).count(),
        'paid_users': db.query(User).filter(User.subscription_tier != 'free').count(),
        'free_users': db.query(User).filter_by(subscription_tier='free').count()
    }
    
    # Recent users
    recent_users = db.query(User).order_by(User.created_at.desc()).limit(10).all()
    
    db.close()
    
    return render_template('admin_dashboard.html', stats=stats, users=recent_users)

@app.route('/admin/users')
@login_required
@admin_required
def admin_users():
    """List all users"""
    db = get_db_session()
    users = db.query(User).order_by(User.created_at.desc()).all()
    db.close()
    return render_template('admin_users.html', users=users)

@app.route('/admin/user/<int:user_id>/toggle-admin', methods=['POST'])
@login_required
@admin_required
def admin_toggle_admin(user_id):
    """Toggle admin status for a user"""
    db = get_db_session()
    user = db.query(User).get(user_id)
    
    if user:
        if user.id == current_user.id:
            flash('Cannot remove admin from yourself.', 'danger')
        else:
            user.is_admin = not user.is_admin
            db.commit()
            flash(f"Admin status {'granted' if user.is_admin else 'removed'} for {user.email}", 'success')
    
    db.close()
    return redirect(url_for('admin_users'))

@app.route('/admin/user/<int:user_id>/delete', methods=['POST'])
@login_required
@admin_required
def admin_delete_user(user_id):
    """Delete a user"""
    db = get_db_session()
    user = db.query(User).get(user_id)
    
    if user:
        if user.id == current_user.id:
            flash('Cannot delete yourself.', 'danger')
        else:
            db.delete(user)
            db.commit()
            flash(f'User {user.email} deleted.', 'success')
    
    db.close()
    return redirect(url_for('admin_users'))

@app.route('/admin/audit-logs')
@login_required
@admin_required
def admin_audit_logs():
    """View audit logs"""
    db = get_db_session()
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    db.close()
    return render_template('admin_audit_logs.html', logs=logs)

# Error handlers
@app.errorhandler(429)
def rate_limit_handler(e):
    return render_template('error.html', message='Too many requests. Please slow down.'), 429

if __name__ == '__main__':
    import ssl
    try:
        # Enable HTTPS with self-signed certificate for development
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(certfile='server.crt', keyfile='server.key')
        app.run(debug=False, host='127.0.0.1', port=5000, ssl_context=context)
    except FileNotFoundError:
        print("⚠️  SSL certificates not found. Generating self-signed certificates...")
        print("   Run: openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt -days 365 -nodes -subj '/CN=localhost'")
        print("   Falling back to HTTP (cookies won't work properly without HTTPS)")
        app.run(debug=False, host='127.0.0.1', port=5000)
    finally:
        scheduler.shutdown()