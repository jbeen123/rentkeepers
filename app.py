from flask import Flask, render_template, request, redirect, url_for, flash, send_file, jsonify, session, abort
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_mail import Mail, Message

def send_email(to, subject, body):
    """Send an email"""
    try:
        msg = Message(subject, recipients=[to], body=body)
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS
from tenant_portal_routes import tenant_portal
from manager_portal_routes import manager_portal
from apscheduler.schedulers.background import BackgroundScheduler
from models import init_db, get_db_session, User, Tenant, Payment, Invoice, AuditLog, Property, MaintenanceRequest, Expense, RentalApplication, log_action, LateNotice, CalendarEvent, Document, DocumentTemplate
import requests
import os
import stripe
import pyotp
import base64
import qrcode
import io
import json
from datetime import datetime, timedelta
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
CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://localhost:5173", "https://127.0.0.1:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5177", "http://127.0.0.1:5174", "http://127.0.0.1:5175", "http://127.0.0.1:5177"])

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

# Register portal blueprints
app.register_blueprint(tenant_portal)
app.register_blueprint(manager_portal)

# Initialize Owner Statement routes
init_owner_statement_routes(app, mail)
init_payment_routes(app)

# Rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["10000 per day", "1000 per hour"]  # Relaxed for development
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

@app.template_filter('from_json')
def from_json_filter(s):
    """Parse JSON string for use in templates"""
    import json
    try:
        return json.loads(s) if s else []
    except:
        return []

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
        
        if not email or not password:
            flash('Please enter both email and password.', 'danger')
            return render_template('login.html')
        
        try:
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
        except Exception as e:
            app.logger.error(f'Login error: {str(e)}')
            flash('An error occurred. Please try again.', 'danger')
    
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
                         monthly_price='$29.99',
                         yearly_price='$299',
                         lifetime_price='$499')

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
def home():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return render_template('landing.html')

@app.route('/home')
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
        amount_paid = float(request.form['amount_paid'])
        rent_amount = tenant.monthly_rent
        fee_amount = 0.0
        total_amount = amount_paid + fee_amount
        
        payment = Payment(
            tenant_id=tenant_id,
            user_id=current_user.id,
            amount_paid=amount_paid,
            rent_amount=rent_amount,
            fee_amount=fee_amount,
            total_amount=total_amount,
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

@app.route('/api/dashboard/charts', methods=['GET'])
@login_required
def api_dashboard_charts():
    """Get chart data for dashboard visualization"""
    db = get_db_session()
    
    try:
        # 1. Monthly Income Chart (last 6 months)
        from datetime import timedelta
        six_months_ago = datetime.now() - timedelta(days=180)
        
        payments = db.query(Payment).join(Tenant).filter(
            Tenant.user_id == current_user.id,
            Payment.payment_date >= six_months_ago,
            Payment.status == 'completed'
        ).order_by(Payment.payment_date).all()
        
        # Group by month
        monthly_income = {}
        for p in payments:
            month_key = p.for_month
            if month_key not in monthly_income:
                monthly_income[month_key] = 0
            monthly_income[month_key] += p.amount_paid
        
        income_chart = [
            {'month': k, 'income': round(v, 2)}
            for k, v in sorted(monthly_income.items())
        ]
        
        # 2. Occupancy Rate Chart
        properties = db.query(Property).filter_by(user_id=current_user.id, status='active').all()
        occupancy_data = []
        
        for prop in properties:
            total_units = len(prop.tenants) if prop.property_type != 'single_family' else 1
            occupied = sum(1 for t in prop.tenants if t.is_active)
            occupancy_rate = (occupied / total_units * 100) if total_units > 0 else 0
            
            occupancy_data.append({
                'property': prop.name,
                'occupied': occupied,
                'total': total_units,
                'rate': round(occupancy_rate, 1)
            })
        
        # 3. Payment Status Distribution (current month)
        current_month = datetime.now().strftime('%Y-%m')
        tenants = db.query(Tenant).filter_by(user_id=current_user.id, is_active=True).all()
        
        status_counts = {'paid': 0, 'pending': 0, 'late': 0}
        
        for tenant in tenants:
            payment = db.query(Payment).filter_by(
                tenant_id=tenant.id,
                for_month=current_month,
                status='completed'
            ).first()
            
            due_day = min(tenant.due_day, calendar.monthrange(datetime.now().year, datetime.now().month)[1])
            days_until_due = due_day - datetime.now().day
            
            if payment and payment.amount_paid >= tenant.monthly_rent:
                status_counts['paid'] += 1
            elif days_until_due < 0:
                status_counts['late'] += 1
            else:
                status_counts['pending'] += 1
        
        # 4. Payment Method Distribution (last 3 months)
        three_months_ago = datetime.now() - timedelta(days=90)
        payment_methods = db.query(Payment).join(Tenant).filter(
            Tenant.user_id == current_user.id,
            Payment.payment_date >= three_months_ago,
            Payment.status == 'completed'
        ).all()
        
        method_counts = {}
        for p in payment_methods:
            method = p.payment_method or 'unknown'
            method_counts[method] = method_counts.get(method, 0) + 1
        
        method_chart = [
            {'method': k.capitalize(), 'count': v}
            for k, v in method_counts.items()
        ]
        
        return jsonify({
            'income': income_chart,
            'occupancy': occupancy_data,
            'payment_status': status_counts,
            'payment_methods': method_chart
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

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
        amount_paid = float(data.get('amount_paid', 0))
        rent_amount = tenant.monthly_rent
        fee_amount = 0.0
        total_amount = amount_paid + fee_amount
        
        payment = Payment(
            tenant_id=tenant.id,
            user_id=current_user.id,
            amount_paid=amount_paid,
            rent_amount=rent_amount,
            fee_amount=fee_amount,
            total_amount=total_amount,
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

@app.route('/api/properties', methods=['GET', 'POST'])
@login_required
def api_properties():
    """List properties or create new property"""
    db = get_db_session()
    
    if request.method == 'POST':
        try:
            data = request.get_json()
            property = Property(
                user_id=current_user.id,
                name=data.get('name', ''),
                address=data.get('address', ''),
                city=data.get('city', ''),
                state=data.get('state', ''),
                zip_code=data.get('zip_code', ''),
                property_type=data.get('property_type', 'single_family'),
                bedrooms=float(data.get('bedrooms', 0)) if data.get('bedrooms') else None,
                bathrooms=float(data.get('bathrooms', 0)) if data.get('bathrooms') else None,
                square_footage=int(data.get('square_footage', 0)) if data.get('square_footage') else None,
                year_built=int(data.get('year_built', 0)) if data.get('year_built') else None,
                purchase_price=float(data.get('purchase_price', 0)) if data.get('purchase_price') else None,
                property_tax=float(data.get('property_tax', 0)) if data.get('property_tax') else None,
                insurance_cost=float(data.get('insurance_cost', 0)) if data.get('insurance_cost') else None,
                maintenance_budget=float(data.get('maintenance_budget', 0)) if data.get('maintenance_budget') else None
            )
            db.add(property)
            db.commit()
            
            log_action(current_user.id, 'PROPERTY_ADDED', 'property', property.id,
                      f"Added property: {property.name}", request.remote_addr)
            
            db.close()
            return jsonify({'id': property.id, 'name': property.name, 'address': property.address}), 201
        except Exception as e:
            db.rollback()
            db.close()
            return jsonify({'error': str(e)}), 500
    
    # GET - list properties
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

# ============== MAINTENANCE PORTAL ==============

@app.route('/maintenance')
@login_required
def maintenance_dashboard():
    """View all maintenance requests"""
    db = get_db_session()
    
    # Get all maintenance requests for this user's properties/tenants
    open_requests = db.query(MaintenanceRequest).filter_by(
        user_id=current_user.id, status='open'
    ).order_by(MaintenanceRequest.created_at.desc()).all()
    
    in_progress = db.query(MaintenanceRequest).filter_by(
        user_id=current_user.id, status='in_progress'
    ).order_by(MaintenanceRequest.created_at.desc()).all()
    
    completed = db.query(MaintenanceRequest).filter(
        MaintenanceRequest.user_id == current_user.id,
        MaintenanceRequest.status == 'completed'
    ).order_by(MaintenanceRequest.completed_at.desc()).limit(50).all()
    
    db.close()
    
    return render_template('maintenance.html', 
                          open_requests=open_requests,
                          in_progress=in_progress,
                          completed=completed)

@app.route('/maintenance/add', methods=['POST'])
@login_required
def add_maintenance_request():
    """Add a new maintenance request"""
    db = get_db_session()
    
    try:
        request_obj = MaintenanceRequest(
            user_id=current_user.id,
            property_id=int(request.form.get('property_id')) if request.form.get('property_id') else None,
            tenant_id=int(request.form.get('tenant_id')) if request.form.get('tenant_id') else None,
            title=request.form['title'],
            description=request.form.get('description', ''),
            priority=request.form.get('priority', 'medium'),
            status='open',
            estimated_cost=float(request.form['estimated_cost']) if request.form.get('estimated_cost') else None
        )
        db.add(request_obj)
        db.commit()
        
        flash('Maintenance request submitted!', 'success')
        log_action(current_user.id, 'MAINTENANCE_CREATED', 'maintenance', request_obj.id,
                  f"Created: {request_obj.title}", request.remote_addr)
    except Exception as e:
        db.rollback()
        flash(f'Error creating request: {str(e)}', 'danger')
    finally:
        db.close()
    
    return redirect(url_for('maintenance_dashboard'))

@app.route('/maintenance/<int:request_id>/update', methods=['POST'])
@login_required
def update_maintenance_request(request_id):
    """Update maintenance request status"""
    db = get_db_session()
    
    req = db.query(MaintenanceRequest).filter_by(
        id=request_id, user_id=current_user.id
    ).first()
    
    if not req:
        flash('Request not found', 'danger')
        db.close()
        return redirect(url_for('maintenance_dashboard'))
    
    try:
        old_status = req.status
        req.status = request.form.get('status', req.status)
        req.priority = request.form.get('priority', req.priority)
        req.actual_cost = float(request.form['actual_cost']) if request.form.get('actual_cost') else req.actual_cost
        
        if req.status == 'completed' and old_status != 'completed':
            req.completed_at = datetime.utcnow()
        
        db.commit()
        flash('Maintenance request updated!', 'success')
        log_action(current_user.id, 'MAINTENANCE_UPDATED', 'maintenance', req.id,
                  f"Status: {old_status} -> {req.status}", request.remote_addr)
    except Exception as e:
        db.rollback()
        flash(f'Error updating: {str(e)}', 'danger')
    finally:
        db.close()
    
    return redirect(url_for('maintenance_dashboard'))

@app.route('/maintenance/<int:request_id>/delete', methods=['POST'])
@login_required
def delete_maintenance_request(request_id):
    """Delete a maintenance request"""
    db = get_db_session()
    
    req = db.query(MaintenanceRequest).filter_by(
        id=request_id, user_id=current_user.id
    ).first()
    
    if req:
        db.delete(req)
        db.commit()
        flash('Maintenance request deleted.', 'success')
    else:
        flash('Request not found', 'danger')
    
    db.close()
    return redirect(url_for('maintenance_dashboard'))

# ============== TENANT MAINTENANCE PORTAL ==============

@app.route('/portal/maintenance', methods=['GET', 'POST'])
def portal_submit_maintenance():
    """Tenant portal for submitting maintenance requests"""
    token = request.args.get('token') or request.form.get('token')
    
    if not token:
        return "Access denied", 403
    
    db = get_db_session()
    tenant = db.query(Tenant).filter_by(portal_token=token, portal_enabled=True).first()
    
    if not tenant:
        db.close()
        return "Invalid or expired portal link", 403
    
    if request.method == 'POST':
        try:
            req = MaintenanceRequest(
                user_id=tenant.user_id,
                property_id=tenant.property_id,
                tenant_id=tenant.id,
                title=request.form['title'],
                description=request.form.get('description', ''),
                priority=request.form.get('priority', 'medium'),
                status='open'
            )
            
            # Handle photo uploads
            photos = request.files.getlist('photos')
            photo_paths = []
            for photo in photos:
                if photo and photo.filename and allowed_file(photo.filename):
                    filename = secure_filename(f"maint_tenant_{tenant.id}_{photo.filename}")
                    filepath = os.path.join(MAINTENANCE_FOLDER, filename)
                    photo.save(filepath)
                    photo_paths.append(filepath)
            
            if photo_paths:
                req.photo_paths = json.dumps(photo_paths)
            
            db.add(req)
            db.commit()
            
            # Send notification to landlord
            user = db.query(User).filter_by(id=tenant.user_id).first()
            if user and user.email:
                subject = f"🔧 New Maintenance Request from {tenant.name}"
                body = f"""
A new maintenance request has been submitted.

Tenant: {tenant.name}
Property: {tenant.property_address}

Issue: {req.title}
Priority: {req.priority}
Description: {req.description}

View in dashboard: https://127.0.0.1:5000/maintenance
"""
                send_email(user.email, subject, body)
            
            flash('Your maintenance request has been submitted!', 'success')
        except Exception as e:
            db.rollback()
            flash(f'Error submitting request: {str(e)}', 'danger')
    
    # Get tenant's existing requests
    requests = db.query(MaintenanceRequest).filter_by(tenant_id=tenant.id).order_by(
        MaintenanceRequest.created_at.desc()
    ).all()
    
    db.close()
    return render_template('tenant_maintenance.html', tenant=tenant, token=token, requests=requests)

# ============== HIGH PRIORITY FEATURES ==============

import os
import json
import werkzeug
from werkzeug.utils import secure_filename

# Upload configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
LEASE_FOLDER = os.path.join(UPLOAD_FOLDER, 'leases')
MAINTENANCE_FOLDER = os.path.join(UPLOAD_FOLDER, 'maintenance')
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'gif'}

# Ensure upload directories exist
os.makedirs(LEASE_FOLDER, exist_ok=True)
os.makedirs(MAINTENANCE_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/tenant/<int:tenant_id>/upload-lease', methods=['POST'])
@login_required
def upload_lease(tenant_id):
    """Upload lease document for a tenant"""
    db = get_db_session()
    try:
        tenant = db.query(Tenant).filter_by(id=tenant_id, user_id=current_user.id).first()
        if not tenant:
            return jsonify({'error': 'Tenant not found'}), 404
        
        if 'lease' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['lease']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Allowed: PDF, PNG, JPG, JPEG, GIF'}), 400
        
        # Save file
        filename = secure_filename(f"tenant_{tenant_id}_{file.filename}")
        filepath = os.path.join(LEASE_FOLDER, filename)
        file.save(filepath)
        
        # Update tenant record
        tenant.lease_document_path = filepath
        db.commit()
        
        log_action(current_user.id, 'LEASE_UPLOADED', 'tenant', tenant_id, f"Uploaded: {filename}")
        
        return jsonify({
            'success': True,
            'message': 'Lease document uploaded successfully',
            'path': filepath
        })
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/tenant/<int:tenant_id>/lease', methods=['GET'])
@login_required
def get_lease(tenant_id):
    """Get lease document path for a tenant"""
    db = get_db_session()
    try:
        tenant = db.query(Tenant).filter_by(id=tenant_id, user_id=current_user.id).first()
        if not tenant:
            return jsonify({'error': 'Tenant not found'}), 404
        
        return jsonify({
            'has_lease': bool(tenant.lease_document_path),
            'path': tenant.lease_document_path
        })
    finally:
        db.close()

@app.route('/api/maintenance/<int:request_id>/upload-photo', methods=['POST'])
@login_required
def upload_maintenance_photo(request_id):
    """Upload photo for maintenance request"""
    db = get_db_session()
    try:
        req = db.query(MaintenanceRequest).filter_by(id=request_id, user_id=current_user.id).first()
        if not req:
            return jsonify({'error': 'Maintenance request not found'}), 404
        
        if 'photo' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['photo']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Allowed: PDF, PNG, JPG, JPEG, GIF'}), 400
        
        # Save file
        filename = secure_filename(f"maint_{request_id}_{file.filename}")
        filepath = os.path.join(MAINTENANCE_FOLDER, filename)
        file.save(filepath)
        
        # Add to photo_paths JSON array
        photo_paths = json.loads(req.photo_paths) if req.photo_paths else []
        photo_paths.append(filepath)
        req.photo_paths = json.dumps(photo_paths)
        
        db.commit()
        
        log_action(current_user.id, 'PHOTO_UPLOADED', 'maintenance', request_id, f"Uploaded: {filename}")
        
        return jsonify({
            'success': True,
            'message': 'Photo uploaded successfully',
            'path': filepath
        })
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/maintenance/<int:request_id>/photos', methods=['GET'])
@login_required
def get_maintenance_photos(request_id):
    """Get photos for maintenance request"""
    db = get_db_session()
    try:
        req = db.query(MaintenanceRequest).filter_by(id=request_id, user_id=current_user.id).first()
        if not req:
            return jsonify({'error': 'Maintenance request not found'}), 404
        
        photo_paths = json.loads(req.photo_paths) if req.photo_paths else []
        return jsonify({'photos': photo_paths})
    finally:
        db.close()

# ============== LATE FEE AUTOMATION ==============

def calculate_late_fee(tenant, payment_date):
    """Calculate late fee based on tenant settings and payment date"""
    if not tenant.late_fee_enabled:
        return 0.0
    
    # Calculate due date
    due_date = date(payment_date.year, payment_date.month, tenant.due_day)
    grace_end = due_date + timedelta(days=tenant.grace_period_days)
    
    # If paid within grace period, no late fee
    if payment_date.date() <= grace_end:
        return 0.0
    
    # Calculate late fee
    if tenant.late_fee_type == 'percentage':
        return tenant.monthly_rent * (tenant.late_fee_amount / 100)
    else:  # flat fee
        return tenant.late_fee_amount

def apply_late_fees():
    """Background job to apply late fees to overdue payments"""
    db = get_db_session()
    try:
        today = datetime.now().date()
        
        # Find all active tenants with late fees enabled
        tenants = db.query(Tenant).filter_by(is_active=True, late_fee_enabled=True).all()
        
        for tenant in tenants:
            # Get current month's payment
            current_month = datetime.now().strftime('%Y-%m')
            payment = db.query(Payment).filter_by(
                tenant_id=tenant.id,
                for_month=current_month,
                status='completed'
            ).first()
            
            # Skip if no payment or already has late fee
            if not payment or payment.late_fee_applied:
                continue
            
            # Check if payment is late
            due_date = date(today.year, today.month, tenant.due_day)
            grace_end = due_date + timedelta(days=tenant.grace_period_days)
            
            if today > grace_end:
                late_fee = calculate_late_fee(tenant, payment.payment_date)
                if late_fee > 0:
                    payment.late_fee_applied = True
                    payment.late_fee_amount = late_fee
                    payment.total_amount = payment.amount_paid + payment.fee_amount + late_fee
                    db.commit()
                    
                    log_action(tenant.user_id, 'LATE_FEE_APPLIED', 'tenant', tenant.id, 
                              f"Late fee ${late_fee:.2f} applied for {current_month}")
                    
                    # Send notification email
                    user = db.query(User).get(tenant.user_id)
                    if user:
                        subject = f"Late Fee Applied - {tenant.name}"
                        body = f"""
A late fee has been automatically applied to {tenant.name}'s payment for {current_month}.

Tenant: {tenant.name}
Property: {tenant.property_address}
Late Fee: ${late_fee:.2f}
Grace Period: {tenant.grace_period_days} days

The payment total has been updated to include the late fee.
"""
                        send_email(user.email, subject, body)
        
        print(f"[LATE FEES] Checked {len(tenants)} tenants")
    except Exception as e:
        print(f"[LATE FEES] Error: {str(e)}")
        db.rollback()
    finally:
        db.close()

# Schedule late fee check daily at 2 AM
scheduler.add_job(
    apply_late_fees,
    'cron',
    hour=2,
    minute=0,
    id='late_fees',
    replace_existing=True
)

# ============== EXPENSE TRACKING ROUTES ==============

@app.route('/expenses', methods=['GET'])
@login_required
def get_expenses():
    """Get all expenses for current user, optionally filtered by property"""
    db = get_db_session()
    try:
        property_id = request.args.get('property_id', type=int)
        
        query = db.query(Expense).filter_by(user_id=current_user.id)
        if property_id:
            query = query.filter_by(property_id=property_id)
        
        expenses = query.order_by(Expense.expense_date.desc()).all()
        
        return jsonify({
            'expenses': [{
                'id': e.id,
                'property_id': e.property_id,
                'description': e.description,
                'category': e.category,
                'amount': e.amount,
                'expense_date': e.expense_date.isoformat() if e.expense_date else None,
                'for_month': e.for_month,
                'vendor_name': e.vendor_name,
                'vendor_invoice': e.vendor_invoice,
                'is_tax_deductible': e.is_tax_deductible,
                'receipt_url': e.receipt_url,
                'created_at': e.created_at.isoformat() if e.created_at else None
            } for e in expenses]
        })
    finally:
        db.close()

@app.route('/expenses', methods=['POST'])
@login_required
def add_expense():
    """Add a new expense"""
    db = get_db_session()
    try:
        data = request.json
        expense = Expense(
            user_id=current_user.id,
            property_id=data['property_id'],
            description=data['description'],
            category=data['category'],
            amount=float(data['amount']),
            expense_date=datetime.strptime(data['expense_date'], '%Y-%m-%d').date() if data.get('expense_date') else datetime.now().date(),
            for_month=data.get('for_month'),
            vendor_name=data.get('vendor_name'),
            vendor_invoice=data.get('vendor_invoice'),
            is_tax_deductible=data.get('is_tax_deductible', True),
            receipt_url=data.get('receipt_url')
        )
        db.add(expense)
        db.commit()
        
        log_action(current_user.id, 'EXPENSE_ADDED', 'expense', expense.id, 
                  f"${expense.amount:.2f} - {expense.category}")
        
        return jsonify({'success': True, 'expense': {
            'id': expense.id,
            'description': expense.description,
            'category': expense.category,
            'amount': expense.amount
        }})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/expenses/<int:expense_id>', methods=['DELETE'])
@login_required
def delete_expense(expense_id):
    """Delete an expense"""
    db = get_db_session()
    try:
        expense = db.query(Expense).filter_by(id=expense_id, user_id=current_user.id).first()
        if not expense:
            return jsonify({'error': 'Expense not found'}), 404
        
        db.delete(expense)
        db.commit()
        
        log_action(current_user.id, 'EXPENSE_DELETED', 'expense', expense_id)
        
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/expenses/summary', methods=['GET'])
@login_required
def get_expense_summary():
    """Get expense summary by category for tax reporting"""
    db = get_db_session()
    try:
        year = request.args.get('year', datetime.now().year, type=int)
        
        from sqlalchemy import func
        summary = db.query(
            Expense.category,
            func.sum(Expense.amount).label('total'),
            func.count(Expense.id).label('count')
        ).filter(
            Expense.user_id == current_user.id,
            func.strftime('%Y', Expense.expense_date) == str(year)
        ).group_by(Expense.category).all()
        
        total_expenses = sum(s.total for s in summary)
        deductible_expenses = db.query(
            func.sum(Expense.amount)
        ).filter(
            Expense.user_id == current_user.id,
            func.strftime('%Y', Expense.expense_date) == str(year),
            Expense.is_tax_deductible == True
        ).scalar() or 0
        
        return jsonify({
            'year': year,
            'by_category': [{
                'category': s.category,
                'total': round(s.total, 2),
                'count': s.count
            } for s in summary],
            'total_expenses': round(total_expenses, 2),
            'deductible_expenses': round(deductible_expenses, 2)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

# ============== RENTAL APPLICATION ROUTES ==============

@app.route('/api/applications', methods=['GET'])
@login_required
def get_applications():
    """Get all rental applications for current user"""
    db = get_db_session()
    try:
        property_id = request.args.get('property_id', type=int)
        status = request.args.get('status')
        
        query = db.query(RentalApplication).filter_by(user_id=current_user.id)
        if property_id:
            query = query.filter_by(property_id=property_id)
        if status:
            query = query.filter_by(status=status)
        
        applications = query.order_by(RentalApplication.created_at.desc()).all()
        
        return jsonify({
            'applications': [{
                'id': a.id,
                'property_id': a.property_id,
                'property_name': a.property_rel.name if a.property_rel else None,
                'applicant_name': f"{a.first_name} {a.last_name}",
                'email': a.email,
                'phone': a.phone,
                'employment_status': a.employment_status,
                'monthly_income': a.monthly_income,
                'status': a.status,
                'screening_status': a.screening_status,
                'created_at': a.created_at.isoformat() if a.created_at else None,
                'move_in_date': a.move_in_date.isoformat() if a.move_in_date else None
            } for a in applications]
        })
    finally:
        db.close()

@app.route('/api/applications/<int:app_id>', methods=['GET'])
@login_required
def get_application(app_id):
    """Get detailed rental application"""
    db = get_db_session()
    try:
        application = db.query(RentalApplication).filter_by(
            id=app_id, user_id=current_user.id
        ).first()
        
        if not application:
            return jsonify({'error': 'Application not found'}), 404
        
        # Parse JSON fields
        import json
        additional_occupants = json.loads(application.additional_occupants) if application.additional_occupants else []
        pet_details = json.loads(application.pet_details) if application.pet_details else []
        references = json.loads(application.applicant_references) if application.applicant_references else []
        
        return jsonify({
            'application': {
                'id': application.id,
                'property_id': application.property_id,
                'first_name': application.first_name,
                'last_name': application.last_name,
                'email': application.email,
                'phone': application.phone,
                'date_of_birth': application.date_of_birth.isoformat() if application.date_of_birth else None,
                'ssn_last4': application.ssn_last4,
                'current_address': application.current_address,
                'current_city': application.current_city,
                'current_state': application.current_state,
                'current_zip': application.current_zip,
                'current_rent': application.current_rent,
                'landlord_name': application.landlord_name,
                'landlord_phone': application.landlord_phone,
                'employment_status': application.employment_status,
                'employer_name': application.employer_name,
                'employer_phone': application.employer_phone,
                'position': application.position,
                'monthly_income': application.monthly_income,
                'additional_occupants': additional_occupants,
                'has_pets': application.has_pets,
                'pet_details': pet_details,
                'has_vehicle': application.has_vehicle,
                'vehicle_make': application.vehicle_make,
                'vehicle_model': application.vehicle_model,
                'vehicle_year': application.vehicle_year,
                'vehicle_color': application.vehicle_color,
                'license_plate': application.license_plate,
                'references': references,
                'move_in_date': application.move_in_date.isoformat() if application.move_in_date else None,
                'lease_term': application.lease_term,
                'how_heard': application.how_heard,
                'additional_comments': application.additional_comments,
                'consent_background_check': application.consent_background_check,
                'consent_credit_check': application.consent_credit_check,
                'status': application.status,
                'screening_status': application.screening_status,
                'screening_report_url': application.screening_report_url,
                'admin_notes': application.admin_notes,
                'created_at': application.created_at.isoformat() if application.created_at else None
            }
        })
    finally:
        db.close()

@app.route('/api/applications', methods=['POST'])
def submit_application():
    """Submit a new rental application (public route)"""
    db = get_db_session()
    try:
        data = request.json
        
        # Find property and landlord
        property_id = data.get('property_id')
        if property_id:
            property = db.query(Property).get(property_id)
            if not property:
                return jsonify({'error': 'Property not found'}), 404
            user_id = property.user_id
        else:
            user_id = data.get('user_id')
            if not user_id:
                return jsonify({'error': 'Property or user ID required'}), 400
        
        application = RentalApplication(
            user_id=user_id,
            property_id=property_id,
            first_name=data['first_name'],
            last_name=data['last_name'],
            email=data['email'],
            phone=data['phone'],
            date_of_birth=datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date() if data.get('date_of_birth') else None,
            ssn_last4=data.get('ssn_last4'),
            current_address=data['current_address'],
            current_city=data['current_city'],
            current_state=data['current_state'],
            current_zip=data['current_zip'],
            current_rent=float(data['current_rent']) if data.get('current_rent') else None,
            landlord_name=data.get('landlord_name'),
            landlord_phone=data.get('landlord_phone'),
            employment_status=data['employment_status'],
            employer_name=data.get('employer_name'),
            employer_phone=data.get('employer_phone'),
            position=data.get('position'),
            monthly_income=float(data['monthly_income']) if data.get('monthly_income') else None,
            additional_occupants=json.dumps(data.get('additional_occupants', [])),
            has_pets=data.get('has_pets', False),
            pet_details=json.dumps(data.get('pet_details', [])),
            has_vehicle=data.get('has_vehicle', False),
            vehicle_make=data.get('vehicle_make'),
            vehicle_model=data.get('vehicle_model'),
            vehicle_year=data.get('vehicle_year'),
            vehicle_color=data.get('vehicle_color'),
            license_plate=data.get('license_plate'),
            applicant_references=json.dumps(data.get('references', [])),
            move_in_date=datetime.strptime(data['move_in_date'], '%Y-%m-%d').date() if data.get('move_in_date') else None,
            lease_term=data.get('lease_term'),
            how_heard=data.get('how_heard'),
            additional_comments=data.get('additional_comments'),
            consent_background_check=data.get('consent_background_check', False),
            consent_credit_check=data.get('consent_credit_check', False)
        )
        
        db.add(application)
        db.commit()
        
        # Notify landlord
        user = db.query(User).get(user_id)
        if user and user.email:
            property_name = property.name if property else 'Your Property'
            subject = f"📝 New Rental Application - {application.first_name} {application.last_name}"
            body = f"""
A new rental application has been submitted for {property_name}.

Applicant: {application.first_name} {application.last_name}
Email: {application.email}
Phone: {application.phone}
Employment: {application.employment_status}
Monthly Income: ${application.monthly_income if application.monthly_income else 'N/A'}

Review the application in your RentKeepers dashboard.
"""
            send_email(user.email, subject, body)
        
        return jsonify({
            'success': True,
            'application_id': application.id,
            'message': 'Application submitted successfully!'
        })
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/applications/<int:app_id>/status', methods=['POST'])
@login_required
def update_application_status(app_id):
    """Update application status (approve/deny)"""
    db = get_db_session()
    try:
        data = request.json
        application = db.query(RentalApplication).filter_by(
            id=app_id, user_id=current_user.id
        ).first()
        
        if not application:
            return jsonify({'error': 'Application not found'}), 404
        
        application.status = data['status']
        application.admin_notes = data.get('admin_notes', application.admin_notes)
        
        db.commit()
        
        # Notify applicant
        if application.email:
            status_verbs = {'approved': 'approved', 'denied': 'declined', 'withdrawn': 'withdrawn'}
            status_verb = status_verbs.get(data['status'], 'updated')
            subject = f"Your Rental Application Has Been {status_verb.title()}"
            body = f"""
Dear {application.first_name},

Your rental application has been {status_verb}.

{f"Admin Notes: {application.admin_notes}" if application.admin_notes else ""}

Thank you for your interest.
"""
            send_email(application.email, subject, body)
        
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

# ============== TAX REPORT ROUTES ==============

@app.route('/api/tax-report', methods=['GET'])
@login_required
def generate_tax_report():
    """Generate tax report (1099 prep) for a given year"""
    db = get_db_session()
    try:
        year = request.args.get('year', datetime.now().year, type=int)
        property_id = request.args.get('property_id', type=int)
        
        # Get total rental income
        income_query = db.query(
            func.strftime('%m', Payment.payment_date).label('month'),
            func.sum(Payment.amount_paid).label('income')
        ).filter(
            Payment.user_id == current_user.id,
            func.strftime('%Y', Payment.payment_date) == str(year)
        )
        
        if property_id:
            income_query = income_query.join(Tenant).filter(Tenant.property_id == property_id)
        
        monthly_income = income_query.group_by(
            func.strftime('%m', Payment.payment_date)
        ).all()
        
        # Get expenses by category
        expense_query = db.query(
            Expense.category,
            func.sum(Expense.amount).label('total')
        ).filter(
            Expense.user_id == current_user.id,
            func.strftime('%Y', Expense.expense_date) == str(year)
        )
        
        if property_id:
            expense_query = expense_query.filter(Expense.property_id == property_id)
        
        expenses_by_category = expense_query.group_by(Expense.category).all()
        
        # Calculate totals
        total_income = sum(m.income for m in monthly_income)
        total_expenses = sum(e.total for e in expenses_by_category)
        net_income = total_income - total_expenses
        
        # 1099 categories mapping
        category_mapping = {
            'maintenance': 'Repairs and Maintenance',
            'insurance': 'Insurance',
            'taxes': 'Taxes and Licenses',
            'utilities': 'Utilities',
            'management': 'Management Fees',
            'repairs': 'Repairs',
            'cleaning': 'Cleaning',
            'other': 'Other Expenses'
        }
        
        return jsonify({
            'year': year,
            'property_id': property_id,
            'total_rental_income': round(total_income, 2),
            'total_expenses': round(total_expenses, 2),
            'net_income': round(net_income, 2),
            'monthly_income': [{
                'month': int(m.month),
                'income': round(m.income, 2)
            } for m in monthly_income],
            'expenses_by_category': [{
                'category': e.category,
                '1099_category': category_mapping.get(e.category, e.category),
                'amount': round(e.total, 2)
            } for e in expenses_by_category],
            'deductible_expenses': round(sum(e.total for e in expenses_by_category), 2)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

# ============== STRIPE AUTO-PAY ROUTES ==============

@app.route('/api/autopay/setup', methods=['POST'])
@login_required
def setup_autopay():
    """Setup auto-pay for a tenant using Stripe SetupIntent"""
    db = get_db_session()
    try:
        data = request.json
        tenant_id = data['tenant_id']
        
        tenant = db.query(Tenant).filter_by(id=tenant_id, user_id=current_user.id).first()
        if not tenant:
            return jsonify({'error': 'Tenant not found'}), 404
        
        # Create Stripe SetupIntent to save payment method
        setup_intent = stripe.SetupIntent.create(
            usage='off_session',
            metadata={
                'tenant_id': str(tenant_id),
                'user_id': str(current_user.id)
            }
        )
        
        return jsonify({
            'client_secret': setup_intent.client_secret,
            'setup_intent_id': setup_intent.id
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/autopay/confirm', methods=['POST'])
@login_required
def confirm_autopay():
    """Confirm and save payment method for auto-pay"""
    db = get_db_session()
    try:
        data = request.json
        tenant_id = data['tenant_id']
        payment_method_id = data['payment_method_id']
        
        tenant = db.query(Tenant).filter_by(id=tenant_id, user_id=current_user.id).first()
        if not tenant:
            return jsonify({'error': 'Tenant not found'}), 404
        
        # Attach payment method to Stripe customer
        if not tenant.stripe_customer_id:
            # Create customer if doesn't exist
            customer = stripe.Customer.create(
                email=tenant.email,
                name=tenant.name,
                metadata={'tenant_id': str(tenant_id)}
            )
            tenant.stripe_customer_id = customer.id
        
        # Attach payment method
        stripe.PaymentMethod.attach(
            payment_method_id,
            customer=tenant.stripe_customer_id
        )
        
        # Update default payment method
        stripe.Customer.modify(
            tenant.stripe_customer_id,
            invoice_settings={'default_payment_method': payment_method_id}
        )
        
        db.commit()
        
        log_action(current_user.id, 'AUTOPAY_ENABLED', 'tenant', tenant_id, 
                  f"Payment method: {payment_method_id}")
        
        return jsonify({
            'success': True,
            'message': 'Auto-pay enabled successfully!'
        })
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/autopay/<int:tenant_id>/disable', methods=['POST'])
@login_required
def disable_autopay(tenant_id):
    """Disable auto-pay for a tenant"""
    db = get_db_session()
    try:
        tenant = db.query(Tenant).filter_by(id=tenant_id, user_id=current_user.id).first()
        if not tenant:
            return jsonify({'error': 'Tenant not found'}), 404
        
        # Detach payment method (optional - keep for future use)
        # stripe.PaymentMethod.detach(payment_method_id)
        
        tenant.stripe_customer_id = None
        db.commit()
        
        log_action(current_user.id, 'AUTOPAY_DISABLED', 'tenant', tenant_id)
        
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/autopay/charge', methods=['POST'])
@login_required
def charge_autopay():
    """Manually trigger auto-pay charge for current month"""
    db = get_db_session()
    try:
        data = request.json
        tenant_id = data['tenant_id']
        
        tenant = db.query(Tenant).filter_by(id=tenant_id, user_id=current_user.id).first()
        if not tenant:
            return jsonify({'error': 'Tenant not found'}), 404
        
        if not tenant.stripe_customer_id:
            return jsonify({'error': 'No payment method on file'}), 400
        
        # Create payment intent for off-session charge
        payment_intent = stripe.PaymentIntent.create(
            amount=int(tenant.monthly_rent * 100),  # Convert to cents
            currency='usd',
            customer=tenant.stripe_customer_id,
            off_session=True,
            confirm=True,
            metadata={
                'tenant_id': str(tenant_id),
                'for_month': datetime.now().strftime('%Y-%m'),
                'type': 'autopay'
            }
        )
        
        # Record payment
        payment = Payment(
            tenant_id=tenant_id,
            user_id=current_user.id,
            amount_paid=tenant.monthly_rent,
            rent_amount=tenant.monthly_rent,
            fee_amount=0,
            total_amount=tenant.monthly_rent,
            for_month=datetime.now().strftime('%Y-%m'),
            payment_method='autopay',
            payment_type='rent',
            status='completed',
            stripe_payment_intent_id=payment_intent.id
        )
        db.add(payment)
        db.commit()
        
        log_action(current_user.id, 'AUTOPAY_CHARGE_SUCCESS', 'tenant', tenant_id,
                  f"${tenant.monthly_rent:.2f}")
        
        return jsonify({
            'success': True,
            'payment_id': payment.id,
            'message': 'Auto-pay charge successful!'
        })
    except stripe.CardError as e:
        # Card declined
        log_action(current_user.id, 'AUTOPAY_CHARGE_FAILED', 'tenant', tenant_id,
                  str(e.user_message))
        return jsonify({
            'error': 'Payment failed: ' + str(e.user_message),
            'code': e.code
        }), 400
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/autopay/status/<int:tenant_id>', methods=['GET'])
@login_required
def get_autopay_status(tenant_id):
    """Get auto-pay status for a tenant"""
    db = get_db_session()
    try:
        tenant = db.query(Tenant).filter_by(id=tenant_id, user_id=current_user.id).first()
        if not tenant:
            return jsonify({'error': 'Tenant not found'}), 404
        
        has_payment_method = bool(tenant.stripe_customer_id)
        
        return jsonify({
            'enabled': has_payment_method,
            'tenant_id': tenant_id,
            'tenant_name': tenant.name,
            'monthly_rent': tenant.monthly_rent,
            'due_day': tenant.due_day,
            'card_last4': tenant.card_last4,
            'stripe_customer_id': tenant.stripe_customer_id
        })
    finally:
        db.close()

# ============== AUTO-PAY BACKGROUND JOB ==============

def process_monthly_autopay():
    """Background job to process all auto-pay charges on the 1st of each month"""
    db = get_db_session()
    try:
        # Get all tenants with auto-pay enabled
        tenants = db.query(Tenant).filter(
            Tenant.stripe_customer_id != None,
            Tenant.is_active == True
        ).all()
        
        successful = 0
        failed = 0
        
        for tenant in tenants:
            try:
                # Check if already paid this month
                current_month = datetime.now().strftime('%Y-%m')
                existing_payment = db.query(Payment).filter_by(
                    tenant_id=tenant.id,
                    for_month=current_month,
                    status='completed'
                ).first()
                
                if existing_payment:
                    continue  # Already paid
                
                # Charge the tenant
                payment_intent = stripe.PaymentIntent.create(
                    amount=int(tenant.monthly_rent * 100),
                    currency='usd',
                    customer=tenant.stripe_customer_id,
                    off_session=True,
                    confirm=True,
                    metadata={
                        'tenant_id': str(tenant.id),
                        'for_month': current_month,
                        'type': 'autopay_monthly'
                    }
                )
                
                # Record payment
                payment = Payment(
                    tenant_id=tenant.id,
                    user_id=tenant.user_id,
                    amount_paid=tenant.monthly_rent,
                    rent_amount=tenant.monthly_rent,
                    fee_amount=0,
                    total_amount=tenant.monthly_rent,
                    for_month=current_month,
                    payment_method='autopay',
                    payment_type='rent',
                    status='completed',
                    stripe_payment_intent_id=payment_intent.id
                )
                db.add(payment)
                db.commit()
                
                successful += 1
                
                # Notify landlord
                user = db.query(User).get(tenant.user_id)
                if user and user.email:
                    subject = f"✅ Auto-Pay Successful - {tenant.name}"
                    body = f"""
Auto-pay rent payment has been successfully processed.

Tenant: {tenant.name}
Property: {tenant.property_address}
Amount: ${tenant.monthly_rent:.2f}
Date: {datetime.now().strftime('%Y-%m-%d')}

Payment has been recorded in your RentKeepers dashboard.
"""
                    send_email(user.email, subject, body)
                
            except stripe.CardError as e:
                failed += 1
                log_action(tenant.user_id, 'AUTOPAY_FAILED', 'tenant', tenant.id,
                          str(e.user_message))
                
                # Notify landlord of failure
                user = db.query(User).get(tenant.user_id)
                if user and user.email:
                    subject = f"❌ Auto-Pay Failed - {tenant.name}"
                    body = f"""
Auto-pay rent payment has failed.

Tenant: {tenant.name}
Property: {tenant.property_address}
Expected Amount: ${tenant.monthly_rent:.2f}
Error: {e.user_message}

Please contact the tenant to arrange alternative payment.
"""
                    send_email(user.email, subject, body)
        
        print(f"[AUTOPAY] Processed {len(tenants)} tenants: {successful} successful, {failed} failed")
        
    except Exception as e:
        print(f"[AUTOPAY] Error: {str(e)}")
        db.rollback()
    finally:
        db.close()

# Schedule auto-pay processing on the 1st of each month at 9 AM
scheduler.add_job(
    process_monthly_autopay,
    'cron',
    day=1,
    hour=9,
    minute=0,
    id='monthly_autopay',
    replace_existing=True
)



# ============== LATE RENT WORKFLOW ROUTES ==============

@app.route('/api/late-rent/check', methods=['POST'])
@login_required
def check_late_rent():
    """Check for late rent and send automated notices"""
    db = get_db_session()
    try:
        today = date.today()
        tenants = db.query(Tenant).filter_by(user_id=current_user.id).all()
        
        notices_sent = []
        
        for tenant in tenants:
            # Get current month's payment status
            current_month = today.replace(day=1)
            payment = db.query(Payment).filter(
                Payment.tenant_id == tenant.id,
                Payment.for_month >= current_month
            ).first()
            
            # Check if rent is late (not paid by due day)
            if not payment or payment.payment_date is None:
                due_day = tenant.rent_due_day or 1
                days_late = (today - today.replace(day=due_day)).days
                
                if days_late > 0:
                    # Determine notice type based on days late
                    if days_late <= 3:
                        notice_type = 'reminder'
                        late_fee = 0
                    elif days_late <= 7:
                        notice_type = 'late'
                        late_fee = tenant.late_fee or 50.0
                    elif days_late <= 14:
                        notice_type = 'final'
                        late_fee = tenant.late_fee or 100.0
                    else:
                        notice_type = 'pay_or_quit'
                        late_fee = tenant.late_fee or 150.0
                    
                    # Create notice
                    notice = LateNotice(
                        tenant_id=tenant.id,
                        user_id=current_user.id,
                        payment_id=payment.id if payment else None,
                        days_late=days_late,
                        notice_type=notice_type,
                        amount_due=tenant.monthly_rent + late_fee,
                        late_fee=late_fee,
                        sent_via='email',
                        status='sent'
                    )
                    db.add(notice)
                    
                    # Send email notification
                    if app.config['MAIL_USERNAME']:
                        subject = f"Rent Payment {'Reminder' if notice_type == 'reminder' else 'Notice'} - {tenant.property_address}"
                        body = f"""
Dear {tenant.name},

This is a {'friendly ' if notice_type == 'reminder' else ''}reminder that your rent payment of ${tenant.monthly_rent} was due on the {due_day}{'th' if due_day <= 3 else ''} of this month.

{'Days Late: ' + str(days_late) + chr(10) + 'Late Fee: $' + str(late_fee) + chr(10) if days_late > 3 else ''}Total Amount Due: ${tenant.monthly_rent + late_fee}

{'Please submit payment as soon as possible to avoid additional fees.' if notice_type in ['reminder', 'late'] else 'This is a FINAL NOTICE. Please pay immediately to avoid eviction proceedings.' if notice_type == 'final' else 'PAY OR QUIT NOTICE: Please pay within 3 days or vacate the premises.'}

If you have already sent payment, please disregard this notice.

Best regards,
RentKeepers Property Management
"""
                        send_email(tenant.email, subject, body)
                        notice.delivered = True
                    
                    notices_sent.append({
                        'tenant': tenant.name,
                        'notice_type': notice_type,
                        'days_late': days_late,
                        'amount_due': tenant.monthly_rent + late_fee
                    })
        
        db.commit()
        
        return jsonify({
            'success': True,
            'notices_sent': len(notices_sent),
            'details': notices_sent
        })
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/late-notices', methods=['GET'])
@login_required
def get_late_notices():
    """Get all late notices for user"""
    db = get_db_session()
    try:
        notices = db.query(LateNotice).filter_by(user_id=current_user.id).order_by(LateNotice.created_at.desc()).limit(50).all()
        
        return jsonify({
            'notices': [{
                'id': notice.id,
                'tenant_name': notice.tenant.name,
                'tenant_id': notice.tenant_id,
                'days_late': notice.days_late,
                'notice_type': notice.notice_type,
                'amount_due': notice.amount_due,
                'late_fee': notice.late_fee,
                'status': notice.status,
                'sent_at': notice.sent_at.isoformat() if notice.sent_at else None,
                'delivered': notice.delivered
            } for notice in notices]
        })
    finally:
        db.close()

@app.route('/api/late-notices/<int:notice_id>/status', methods=['POST'])
@login_required
def update_notice_status(notice_id):
    """Update late notice status"""
    db = get_db_session()
    try:
        data = request.json
        notice = db.query(LateNotice).filter_by(id=notice_id, user_id=current_user.id).first()
        
        if not notice:
            return jsonify({'error': 'Notice not found'}), 404
        
        notice.status = data.get('status', notice.status)
        notice.notes = data.get('notes', notice.notes)
        db.commit()
        
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ============== CALENDAR ROUTES ==============

@app.route('/api/calendar/events', methods=['GET'])
@login_required
def get_calendar_events():
    """Get calendar events"""
    db = get_db_session()
    try:
        start_date = request.args.get('start')
        end_date = request.args.get('end')
        event_type = request.args.get('type')
        
        query = db.query(CalendarEvent).filter_by(user_id=current_user.id)
        
        if start_date:
            query = query.filter(CalendarEvent.start_date >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(CalendarEvent.start_date <= datetime.fromisoformat(end_date))
        if event_type and event_type != 'all':
            query = query.filter(CalendarEvent.event_type == event_type)
        
        events = query.order_by(CalendarEvent.start_date).all()
        
        return jsonify({
            'events': [{
                'id': event.id,
                'title': event.title,
                'description': event.description,
                'event_type': event.event_type,
                'start_date': event.start_date.isoformat() if event.start_date else None,
                'end_date': event.end_date.isoformat() if event.end_date else None,
                'all_day': event.all_day,
                'recurring': event.recurring,
                'color': event.color,
                'priority': event.priority,
                'tenant_id': event.tenant_id,
                'property_id': event.property_id
            } for event in events]
        })
    finally:
        db.close()

@app.route('/api/calendar/events', methods=['POST'])
@login_required
def create_calendar_event():
    """Create calendar event"""
    db = get_db_session()
    try:
        data = request.json
        
        event = CalendarEvent(
            user_id=current_user.id,
            title=data.get('title'),
            description=data.get('description'),
            event_type=data.get('event_type', 'custom'),
            start_date=datetime.fromisoformat(data.get('start_date')),
            end_date=datetime.fromisoformat(data.get('end_date')) if data.get('end_date') else None,
            all_day=data.get('all_day', True),
            recurring=data.get('recurring', False),
            recurring_pattern=data.get('recurring_pattern'),
            tenant_id=data.get('tenant_id'),
            property_id=data.get('property_id'),
            color=data.get('color', 'blue'),
            priority=data.get('priority', 'normal'),
            reminder_enabled=data.get('reminder_enabled', True),
            reminder_days_before=data.get('reminder_days_before', 3)
        )
        
        db.add(event)
        db.commit()
        
        log_action(current_user.id, 'CALENDAR_EVENT_CREATED', details=f"Created: {event.title}")
        
        return jsonify({'success': True, 'event_id': event.id})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/calendar/events/<int:event_id>', methods=['PUT'])
@login_required
def update_calendar_event(event_id):
    """Update calendar event"""
    db = get_db_session()
    try:
        data = request.json
        event = db.query(CalendarEvent).filter_by(id=event_id, user_id=current_user.id).first()
        
        if not event:
            return jsonify({'error': 'Event not found'}), 404
        
        event.title = data.get('title', event.title)
        event.description = data.get('description', event.description)
        event.event_type = data.get('event_type', event.event_type)
        event.start_date = datetime.fromisoformat(data.get('start_date')) if data.get('start_date') else event.start_date
        event.end_date = datetime.fromisoformat(data.get('end_date')) if data.get('end_date') else event.end_date
        event.all_day = data.get('all_day', event.all_day)
        event.color = data.get('color', event.color)
        event.priority = data.get('priority', event.priority)
        
        db.commit()
        
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/calendar/events/<int:event_id>', methods=['DELETE'])
@login_required
def delete_calendar_event(event_id):
    """Delete calendar event"""
    db = get_db_session()
    try:
        event = db.query(CalendarEvent).filter_by(id=event_id, user_id=current_user.id).first()
        
        if not event:
            return jsonify({'error': 'Event not found'}), 404
        
        db.delete(event)
        db.commit()
        
        log_action(current_user.id, 'CALENDAR_EVENT_DELETED', details=f"Deleted: {event.title}")
        
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ============== DOCUMENT MANAGEMENT ROUTES ==============

@app.route('/api/documents', methods=['GET'])
@login_required
def get_documents():
    """Get all documents for user"""
    db = get_db_session()
    try:
        doc_type = request.args.get('type')
        property_id = request.args.get('property_id')
        tenant_id = request.args.get('tenant_id')
        
        query = db.query(Document).filter_by(user_id=current_user.id)
        
        if doc_type and doc_type != 'all':
            query = query.filter(Document.document_type == doc_type)
        if property_id:
            query = query.filter_by(property_id=property_id)
        if tenant_id:
            query = query.filter_by(tenant_id=tenant_id)
        
        documents = query.order_by(Document.created_at.desc()).all()
        
        return jsonify({
            'documents': [{
                'id': doc.id,
                'title': doc.title,
                'description': doc.description,
                'document_type': doc.document_type,
                'file_name': doc.file_name,
                'file_size': doc.file_size,
                'property_id': doc.property_id,
                'tenant_id': doc.tenant_id,
                'tags': doc.tags,
                'is_signed': doc.is_signed,
                'created_at': doc.created_at.isoformat() if doc.created_at else None
            } for doc in documents]
        })
    finally:
        db.close()

@app.route('/api/documents', methods=['POST'])
@login_required
def upload_document():
    """Upload document"""
    db = get_db_session()
    try:
        # Handle file upload
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save file
        import os
        from werkzeug.utils import secure_filename
        
        upload_dir = f"uploads/users/{current_user.id}/documents"
        os.makedirs(upload_dir, exist_ok=True)
        
        filename = secure_filename(file.filename)
        filepath = f"{upload_dir}/{filename}"
        file.save(filepath)
        
        # Get file size
        file_size = os.path.getsize(filepath)
        
        # Create document record
        document = Document(
            user_id=current_user.id,
            title=request.form.get('title', file.filename),
            description=request.form.get('description'),
            document_type=request.form.get('document_type', 'other'),
            file_path=filepath,
            file_name=filename,
            file_size=file_size,
            mime_type=file.content_type,
            property_id=request.form.get('property_id'),
            tenant_id=request.form.get('tenant_id'),
            tags=request.form.get('tags')
        )
        
        db.add(document)
        db.commit()
        
        log_action(current_user.id, 'DOCUMENT_UPLOADED', details=f"Uploaded: {filename}")
        
        return jsonify({'success': True, 'document_id': document.id})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/documents/<int:doc_id>', methods=['GET'])
@login_required
def download_document(doc_id):
    """Download document"""
    db = get_db_session()
    try:
        document = db.query(Document).filter_by(id=doc_id, user_id=current_user.id).first()
        
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        return send_file(document.file_path, as_attachment=True, download_name=document.file_name)
    finally:
        db.close()

@app.route('/api/documents/<int:doc_id>', methods=['DELETE'])
@login_required
def delete_document(doc_id):
    """Delete document"""
    db = get_db_session()
    try:
        import os
        
        document = db.query(Document).filter_by(id=doc_id, user_id=current_user.id).first()
        
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        # Delete file
        if os.path.exists(document.file_path):
            os.remove(document.file_path)
        
        db.delete(document)
        db.commit()
        
        log_action(current_user.id, 'DOCUMENT_DELETED', details=f"Deleted: {document.file_name}")
        
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/document-templates', methods=['GET'])
@login_required
def get_document_templates():
    """Get document templates"""
    db = get_db_session()
    try:
        templates = db.query(DocumentTemplate).filter_by(user_id=current_user.id).all()
        
        # Add default templates if none exist
        if len(templates) == 0:
            default_templates = [
                {
                    'name': 'Late Rent Notice',
                    'template_type': 'notice',
                    'content': 'Dear {tenant_name},\n\nThis is a notice that your rent payment is {days_late} days late.\n\nAmount Due: ${amount_due}\n\nPlease submit payment immediately.',
                    'variables': 'tenant_name,days_late,amount_due',
                    'category': 'notice',
                    'is_default': True
                },
                {
                    'name': 'Lease Renewal Letter',
                    'template_type': 'letter',
                    'content': 'Dear {tenant_name},\n\nYour lease is set to expire on {lease_end_date}. We would like to offer you a renewal.\n\nNew Terms:\n- Rent: ${new_rent}\n- Term: {lease_term}\n\nPlease let us know if you would like to renew.',
                    'variables': 'tenant_name,lease_end_date,new_rent,lease_term',
                    'category': 'legal',
                    'is_default': True
                },
                {
                    'name': 'Move-In Inspection Form',
                    'template_type': 'form',
                    'content': '# Move-In Inspection\n\nProperty: {property_address}\nDate: {inspection_date}\n\n## Condition by Room\n\n### Living Room\n- Walls: {living_walls}\n- Floor: {living_floor}\n\n### Kitchen\n- Appliances: {kitchen_appliances}\n- Sink: {kitchen_sink}',
                    'variables': 'property_address,inspection_date,living_walls,living_floor,kitchen_appliances,kitchen_sink',
                    'category': 'inspection',
                    'is_default': True
                }
            ]
            
            for template_data in default_templates:
                template = DocumentTemplate(
                    user_id=current_user.id,
                    **template_data
                )
                db.add(template)
            
            db.commit()
            templates = db.query(DocumentTemplate).filter_by(user_id=current_user.id).all()
        
        return jsonify({
            'templates': [{
                'id': template.id,
                'name': template.name,
                'description': template.description,
                'template_type': template.template_type,
                'content': template.content,
                'variables': template.variables,
                'category': template.category,
                'usage_count': template.usage_count,
                'is_default': template.is_default
            } for template in templates]
        })
    finally:
        db.close()

@app.route('/api/document-templates', methods=['POST'])
@login_required
def create_document_template():
    """Create document template"""
    db = get_db_session()
    try:
        data = request.json
        
        template = DocumentTemplate(
            user_id=current_user.id,
            name=data.get('name'),
            description=data.get('description'),
            template_type=data.get('template_type'),
            content=data.get('content'),
            variables=data.get('variables'),
            category=data.get('category')
        )
        
        db.add(template)
        db.commit()
        
        return jsonify({'success': True, 'template_id': template.id})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/document-templates/<int:template_id>', methods=['DELETE'])
@login_required
def delete_document_template(template_id):
    """Delete document template"""
    db = get_db_session()
    try:
        template = db.query(DocumentTemplate).filter_by(id=template_id, user_id=current_user.id).first()
        
        if not template:
            return jsonify({'error': 'Template not found'}), 404
        
        db.delete(template)
        db.commit()
        
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ============== AI-POWERED FEATURES ==============

def call_ai_api(prompt, system_prompt="You are a helpful assistant.", max_tokens=500):
    """Call AI API (Ollama or OpenAI)"""
    try:
        # Try Ollama first (self-hosted, free)
        ollama_url = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
        response = requests.post(
            f'{ollama_url}/api/generate',
            json={
                'model': 'llama3.2',
                'prompt': prompt,
                'system': system_prompt,
                'stream': False,
                'max_tokens': max_tokens
            },
            timeout=30
        )
        if response.status_code == 200:
            return response.json().get('response', '')
        
        # Fallback to OpenAI
        openai_key = os.getenv('OPENAI_API_KEY')
        if openai_key:
            response = requests.post(
                'https://api.openai.com/v1/chat/completions',
                headers={'Authorization': f'Bearer {openai_key}'},
                json={
                    'model': 'gpt-3.5-turbo',
                    'messages': [
                        {'role': 'system', 'content': system_prompt},
                        {'role': 'user', 'content': prompt}
                    ],
                    'max_tokens': max_tokens
                },
                timeout=30
            )
            if response.status_code == 200:
                return response.json()['choices'][0]['message']['content']
        
        return None
    except Exception as e:
        print(f"AI API error: {e}")
        return None


@app.route('/api/ai/chatbot', methods=['POST'])
@login_required
def ai_chatbot():
    """AI-powered tenant chatbot"""
    db = get_db_session()
    try:
        data = request.json
        message = data.get('message')
        property_id = data.get('property_id')
        conversation_history = data.get('conversation_history', [])
        
        # Get property context
        property_info = None
        if property_id:
            property_info = db.query(Property).filter_by(id=property_id, user_id=current_user.id).first()
        
        # Build system prompt with property context
        system_prompt = f"""You are a friendly, helpful virtual assistant for a rental property.
        
Property Context:
- Property Name: {property_info.name if property_info else 'Rental Property'}
- Address: {property_info.address if property_info else 'N/A'}

Your role is to answer tenant questions about:
- Rent payment (due date is typically the 1st, late after the 5th)
- Maintenance requests (submit through the portal)
- Property policies (no smoking, pets allowed with deposit)
- Lease terms and information
- Emergency contacts (call 911 for emergencies)

Be friendly, concise, and helpful. If you don't know something, suggest they contact the property manager.
For emergencies (fire, medical, gas leak), always tell them to call 911 immediately."""

        # Build conversation context
        context = "\n".join([f"{msg['role']}: {msg['content']}" for msg in conversation_history[-5:]])
        prompt = f"Current conversation:\n{context}\n\nTenant: {message}\n\nAssistant:"

        # Call AI
        response = call_ai_api(prompt, system_prompt, max_tokens=300)
        
        if not response:
            return jsonify({
                'response': "I'm having trouble connecting right now. Please contact the property manager directly."
            })
        
        return jsonify({'response': response.strip()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@app.route('/api/ai/rent-analysis', methods=['POST'])
@login_required
def ai_rent_analysis():
    """AI-powered rent price analysis"""
    db = get_db_session()
    try:
        data = request.json
        property_id = data.get('property_id')
        
        property = db.query(Property).filter_by(id=property_id, user_id=current_user.id).first()
        if not property:
            return jsonify({'error': 'Property not found'}), 404
        
        # Get tenant info for rent data
        tenant = db.query(Tenant).filter_by(property_id=property.id).first()
        current_rent = tenant.monthly_rent if tenant else 0
        
        # Build property description for AI analysis
        property_desc = f"""
Property: {property.name}
Address: {property.address}, {property.city}, {property.state} {property.zip_code}
Bedrooms: {property.bedrooms or 'N/A'}
Bathrooms: {property.bathrooms or 'N/A'}
Square Feet: {property.square_feet or 'N/A'}
Amenities: {property.amenities or 'None listed'}
Current Rent: ${current_rent}/month
"""
        
        # Call AI for analysis
        system_prompt = "You are a real estate rent analysis expert. Analyze rental properties and provide data-driven rent recommendations."
        
        prompt = f"""Analyze this rental property and provide a rent recommendation:

{property_desc}

Please provide:
1. Recommended monthly rent (as a number)
2. Key factors affecting the price (as a list with impact percentages)
3. 3-5 comparable properties with addresses, bed/bath, sqft, and rent

Format your response as JSON:
{{
  "recommended_rent": 2500,
  "current_rent": 2300,
  "factors": [
    {{"factor": "Location", "impact": 5}},
    {{"factor": "Updated Kitchen", "impact": 8}}
  ],
  "comparables": [
    {{"address": "123 Main St", "bed": 2, "bath": 1, "sqft": 900, "rent": 2400, "price_per_sqft": 2.67}}
  ]
}}
"""
        
        ai_response = call_ai_api(prompt, system_prompt, max_tokens=800)
        
        # Parse AI response (fallback to mock data if parsing fails)
        try:
            import json
            # Extract JSON from response
            start_idx = ai_response.find('{')
            end_idx = ai_response.rfind('}') + 1
            if start_idx >= 0 and end_idx > start_idx:
                analysis = json.loads(ai_response[start_idx:end_idx])
            else:
                # Mock data for demo
                analysis = {
                    'recommended_rent': int(current_rent * 1.08) if current_rent else 2500,
                    'current_rent': current_rent,
                    'factors': [
                        {'factor': 'Market Conditions', 'impact': 5},
                        {'factor': 'Property Features', 'impact': 3},
                        {'factor': 'Location', 'impact': 8}
                    ],
                    'comparables': [
                        {'address': '123 Oak Street', 'bed': property.bedrooms or 2, 'bath': property.bathrooms or 1, 'sqft': property.square_feet or 1000, 'rent': int(current_rent * 1.05) if current_rent else 2400, 'price_per_sqft': 2.5},
                        {'address': '456 Maple Avenue', 'bed': property.bedrooms or 2, 'bath': property.bathrooms or 1, 'sqft': property.square_feet or 1000, 'rent': int(current_rent * 1.1) if current_rent else 2600, 'price_per_sqft': 2.7}
                    ]
                }
        except:
            # Fallback mock data
            analysis = {
                'recommended_rent': int(current_rent * 1.08) if current_rent else 2500,
                'current_rent': current_rent,
                'factors': [
                    {'factor': 'Market Conditions', 'impact': 5},
                    {'factor': 'Property Features', 'impact': 3}
                ],
                'comparables': []
            }
        
        log_action(current_user.id, 'AI_RENT_ANALYSIS', resource_type='property', resource_id=property.id, details=f"AI rent analysis for {property.address}")
        
        return jsonify({'analysis': analysis})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@app.route('/api/ai/maintenance-triage', methods=['POST'])
@login_required
def ai_maintenance_triage():
    """AI-powered maintenance request triage"""
    db = get_db_session()
    try:
        data = request.json
        description = data.get('description', '')
        request_id = data.get('request_id')
        
        # Build prompt for AI analysis
        system_prompt = "You are a property maintenance expert. Analyze maintenance requests and categorize them by urgency and type."
        
        prompt = f"""Analyze this maintenance request and provide:

1. URGENCY: emergency, urgent, or routine
2. CATEGORY: plumbing, electrical, hvac, appliance, structural, pest, safety, or other
3. SUMMARY: Brief 1-sentence summary
4. SUGGESTED ACTION: What should be done
5. SUGGESTED VENDOR: Type of professional needed
6. CONFIDENCE: 0-100

Maintenance Request: "{description}"

Format as JSON:
{{
  "urgency": "urgent",
  "category": "plumbing",
  "summary": "Water leak under kitchen sink",
  "suggested_action": "Shut off water and call plumber",
  "suggested_vendor": "Licensed Plumber",
  "confidence": 95
}}
"""
        
        ai_response = call_ai_api(prompt, system_prompt, max_tokens=400)
        
        # Parse AI response
        try:
            import json
            start_idx = ai_response.find('{')
            end_idx = ai_response.rfind('}') + 1
            if start_idx >= 0 and end_idx > start_idx:
                triage = json.loads(ai_response[start_idx:end_idx])
            else:
                triage = {
                    'urgency': 'routine',
                    'category': 'other',
                    'summary': 'Maintenance request received',
                    'suggested_action': 'Schedule during business hours',
                    'suggested_vendor': 'General Contractor',
                    'confidence': 80
                }
        except:
            triage = {
                'urgency': 'routine',
                'category': 'other',
                'summary': 'Maintenance request received',
                'suggested_action': 'Review and schedule',
                'suggested_vendor': 'Contractor',
                'confidence': 75
            }
        
        # Update maintenance request if ID provided
        if request_id:
            maintenance_req = db.query(MaintenanceRequest).filter_by(id=request_id, user_id=current_user.id).first()
            if maintenance_req:
                maintenance_req.priority = triage['urgency']
                db.commit()
        
        return jsonify({'triage': triage})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@app.route('/api/ai/auto-triage-maintenance', methods=['POST'])
@login_required
def auto_triage_maintenance():
    """Automatically triage all pending maintenance requests"""
    db = get_db_session()
    try:
        pending_requests = db.query(MaintenanceRequest).filter_by(
            user_id=current_user.id,
            status='pending'
        ).all()
        
        results = []
        for req in pending_requests:
            # Call AI triage
            system_prompt = "You are a property maintenance expert. Analyze maintenance requests and categorize them."
            prompt = f"""Analyze: "{req.description}"
Return JSON: {{"urgency": "emergency|urgent|routine", "category": "plumbing|electrical|hvac|other", "summary": "brief summary"}}"""
            
            ai_response = call_ai_api(prompt, system_prompt, max_tokens=200)
            
            try:
                import json
                start_idx = ai_response.find('{')
                end_idx = ai_response.rfind('}') + 1
                triage = json.loads(ai_response[start_idx:end_idx]) if start_idx >= 0 else {}
                
                # Update request
                req.priority = triage.get('urgency', 'routine')
                results.append({
                    'request_id': req.id,
                    'urgency': triage.get('urgency', 'routine'),
                    'category': triage.get('category', 'other')
                })
            except:
                pass
        
        db.commit()
        
        return jsonify({'triaged': len(results), 'results': results})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


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