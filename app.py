from flask import Flask, render_template, request, redirect, url_for, flash, send_file, jsonify, session, abort
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_mail import Mail, Message
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from apscheduler.schedulers.background import BackgroundScheduler
from models import init_db, get_db_session, User, Tenant, Payment, Invoice, AuditLog, log_action
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
        checkout_session = stripe.checkout.Session.create(
            customer_email=current_user.email,
            line_items=[{"price": price_id, "quantity": 1}],
            mode='subscription',
            success_url=url_for('payment_success', _external=True) + '?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=url_for('pricing', _external=True),
            metadata={'user_id': current_user.id}
        )
        return redirect(checkout_session.url)
    except Exception as e:
        flash(f'Error creating checkout: {str(e)}', 'danger')
        return redirect(url_for('pricing'))

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
    db.close()
    
    can_add = current_user.can_add_tenant
    
    return render_template('tenants.html', tenants=tenants, can_add=can_add)

@app.route('/tenants/add', methods=['POST'])
@login_required
def add_tenant():
    if not current_user.can_add_tenant:
        flash('Upgrade to Premium for unlimited tenants!', 'warning')
        return redirect(url_for('pricing'))
    
    db = get_db_session()
    
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

@app.route('/payments')
@login_required
def payments():
    db = get_db_session()
    tenants = db.query(Tenant).filter_by(user_id=current_user.id).all()
    
    payment_history = db.query(Payment).filter_by(user_id=current_user.id).order_by(
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
        
        for row in reader:
            if not current_user.can_add_tenant:
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

# Error handlers
@app.errorhandler(429)
def rate_limit_handler(e):
    return render_template('error.html', message='Too many requests. Please slow down.'), 429

if __name__ == '__main__':
    try:
        app.run(debug=False, host='0.0.0.0', port=5000)
    finally:
        scheduler.shutdown()