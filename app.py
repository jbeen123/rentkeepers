from flask import Flask, render_template, request, redirect, url_for, flash, send_file, jsonify, session
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_mail import Mail, Message
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from apscheduler.schedulers.background import BackgroundScheduler
from models import init_db, get_db_session, User, Tenant, Payment, Invoice, AuditLog, log_action
from datetime import datetime, date, timedelta
import calendar
import csv
import io
import os
import json
import stripe
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

# Email reminder scheduler
scheduler = BackgroundScheduler()

def send_rent_reminders():
    """Check for upcoming rent due dates and send reminders"""
    if not app.config['MAIL_USERNAME']:
        return
    
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
                
                # Send reminder
                if days_until_due == user.reminder_days_before or (days_until_due < 0 and days_until_due > -user.reminder_days_before):
                    try:
                        msg = Message(
                            subject=f'Rent Due Reminder - {tenant.name}',
                            recipients=[user.email],
                            body=f"""Hi {user.first_name or 'Landlord'},

This is a friendly reminder that rent is due for:

Tenant: {tenant.name}
Property: {tenant.property_address}
Amount: ${tenant.monthly_rent:.2f}
Due Date: {due_date.strftime('%B %d, %Y')}

{'Payment is overdue by ' + str(abs(days_until_due)) + ' days.' if days_until_due < 0 else 'Payment is due in ' + str(days_until_due) + ' days.'}

Log in to RentKeepers to record the payment:
{request.host_url if request else ''}payments

---
RentKeepers - Simple Rent Tracking
"""
                        )
                        mail.send(msg)
                        print(f"Sent reminder to {user.email} for {tenant.name}")
                    except Exception as e:
                        print(f"Failed to send email to {user.email}: {e}")
    finally:
        db.close()

scheduler.add_job(send_rent_reminders, 'cron', hour=9, minute=0)
scheduler.start()

# Template filters
@app.template_filter('month_name')
def month_name_filter(month_str):
    if month_str and len(month_str) == 7:
        year, month = month_str.split('-')
        return datetime(int(year), int(month), 1).strftime('%B %Y')
    return month_str

# === AUTH ROUTES ===

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

# === SUBSCRIPTION ROUTES ===

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
            user.subscription_tier = 'monthly'  # or parse from metadata
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

# === MAIN APP ROUTES ===

@app.route('/')
@login_required
def dashboard():
    db = get_db_session()
    
    today = date.today()
    current_month = today.strftime('%Y-%m')
    
    tenants = db.query(Tenant).filter_by(user_id=current_user.id).all()
    
    # Build status for each tenant
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

# === EXPORT/IMPORT ===

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

@app.route('/settings', methods=['GET', 'POST'])
@login_required
def settings():
    db = get_db_session()
    user = db.query(User).get(current_user.id)
    
    if request.method == 'POST':
        # Update profile
        user.email = request.form.get('email', user.email)
        user.first_name = request.form.get('first_name', user.first_name)
        user.reminder_enabled = 'reminder_enabled' in request.form
        user.reminder_days_before = int(request.form.get('reminder_days_before', 3))
        user.reminder_time = request.form.get('reminder_time', '09:00')
        
        # Update password
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
    
    try:
        msg = Message(
            subject='RentKeepers - Test Email',
            recipients=[current_user.email],
            body=f"Hi {current_user.first_name or 'there'},\n\nThis is a test email from RentKeepers.\n\nYour email reminders are working!"
        )
        mail.send(msg)
        flash('Test email sent!', 'success')
    except Exception as e:
        flash(f'Failed to send test email: {str(e)}', 'danger')
    
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