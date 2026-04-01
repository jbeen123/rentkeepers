from flask import Flask, render_template, request, redirect, url_for, flash, send_file
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_mail import Mail, Message
from apscheduler.schedulers.background import BackgroundScheduler
from models import init_db, get_db_session, User, Tenant, Payment
from datetime import datetime, date, timedelta
import calendar
import csv
import io
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'rentkeepers-secret-key-change-this')

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
                # Calculate days until due date
                due_day = min(tenant.due_day, calendar.monthrange(today.year, today.month)[1])
                due_date = date(today.year, today.month, due_day)
                
                days_until_due = (due_date - today).days
                
                # Check if payment already received for this month
                payment = db.query(Payment).filter(
                    Payment.tenant_id == tenant.id,
                    Payment.for_month == current_month
                ).first()
                
                if payment:
                    continue  # Already paid
                
                # Send reminder if within the reminder window
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
http://localhost:5000/payments

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

# Schedule reminders to run daily at the user's preferred time
scheduler.add_job(send_rent_reminders, 'cron', hour=9, minute=0)
scheduler.start()

# Template filters
@app.template_filter('month_name')
def month_name_filter(month_str):
    """Convert '2026-03' to 'March 2026'"""
    if month_str and len(month_str) == 7:
        year, month = month_str.split('-')
        return datetime(int(year), int(month), 1).strftime('%B %Y')
    return month_str

# Auth Routes
@app.route('/register', methods=['GET', 'POST'])
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
            # Check if email already exists
            existing = db.query(User).filter_by(email=email).first()
            if existing:
                flash('Email already registered. Please log in.', 'danger')
                db.close()
                return redirect(url_for('login'))
            
            # Create new user
            user = User(email=email, first_name=first_name)
            user.set_password(password)
            db.add(user)
            db.commit()
            
            flash('Account created! Please log in.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            db.rollback()
            flash('Error creating account. Please try again.', 'danger')
        finally:
            db.close()
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
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
            next_page = request.args.get('next')
            flash(f'Welcome back{", " + user.first_name if user.first_name else ""}!', 'success')
            return redirect(next_page or url_for('dashboard'))
        else:
            flash('Invalid email or password.', 'danger')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

@app.route('/settings', methods=['GET', 'POST'])
@login_required
def settings():
    """User settings page for reminders"""
    db = get_db_session()
    user = db.query(User).get(current_user.id)
    
    if request.method == 'POST':
        # Update email settings
        user.reminder_enabled = 'reminder_enabled' in request.form
        user.reminder_days_before = int(request.form.get('reminder_days_before', 3))
        user.reminder_time = request.form.get('reminder_time', '09:00')
        user.email = request.form.get('email', user.email)
        
        # Update password if provided
        new_password = request.form.get('new_password', '')
        if new_password:
            if len(new_password) >= 6:
                user.set_password(new_password)
                flash('Password updated!', 'success')
            else:
                flash('Password must be at least 6 characters.', 'danger')
                db.close()
                return redirect(url_for('settings'))
        
        # Update first name
        user.first_name = request.form.get('first_name', user.first_name)
        
        try:
            db.commit()
            flash('Settings saved!', 'success')
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
    """Send test email to verify SMTP settings"""
    if not app.config['MAIL_USERNAME']:
        flash('Email not configured. Set MAIL_USERNAME in .env file.', 'warning')
        return redirect(url_for('settings'))
    
    try:
        msg = Message(
            subject='RentKeepers - Test Email',
            recipients=[current_user.email],
            body=f"""Hi {current_user.first_name or 'there'},

This is a test email from RentKeepers.

If you're receiving this, your email reminders are configured correctly!

---
RentKeepers - Simple Rent Tracking
"""
        )
        mail.send(msg)
        flash('Test email sent! Check your inbox.', 'success')
    except Exception as e:
        flash(f'Failed to send test email: {str(e)}', 'danger')
    
    return redirect(url_for('settings'))

# Main App Routes
@app.route('/')
@login_required
def dashboard():
    """Main dashboard showing rent status"""
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
        
        # Check if payment exists for current month
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
    """Show all tenants"""
    db = get_db_session()
    tenants = db.query(Tenant).filter_by(user_id=current_user.id).all()
    db.close()
    return render_template('tenants.html', tenants=tenants)

@app.route('/tenants/add', methods=['POST'])
@login_required
def add_tenant():
    """Add new tenant"""
    db = get_db_session()
    
    try:
        tenant = Tenant(
            user_id=current_user.id,
            name=request.form['name'],
            property_address=request.form['property_address'],
            monthly_rent=float(request.form['monthly_rent']),
            due_day=int(request.form['due_day']),
            phone=request.form.get('phone', ''),
            email=request.form.get('email', '')
        )
        db.add(tenant)
        db.commit()
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
    """Edit tenant"""
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
            db.commit()
            flash(f'Tenant "{tenant.name}" updated!', 'success')
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
    """Delete tenant"""
    db = get_db_session()
    tenant = db.query(Tenant).filter_by(id=tenant_id, user_id=current_user.id).first()
    
    if tenant:
        db.delete(tenant)
        db.commit()
        flash(f'Tenant "{tenant.name}" deleted.', 'warning')
    else:
        flash('Tenant not found', 'danger')
    
    db.close()
    return redirect(url_for('list_tenants'))

@app.route('/payments')
@login_required
def payments():
    """Show payment form and history"""
    db = get_db_session()
    tenants = db.query(Tenant).filter_by(user_id=current_user.id).all()
    
    # Get payment history (last 30)
    payment_history = db.query(Payment, Tenant).join(Tenant).filter(
        Tenant.user_id == current_user.id
    ).order_by(
        Payment.payment_date.desc()
    ).limit(30).all()
    
    # Current month for default
    current_month = date.today().strftime('%Y-%m')
    
    db.close()
    return render_template('payments.html', 
                         tenants=tenants, 
                         payment_history=payment_history,
                         current_month=current_month)

@app.route('/payments/add', methods=['POST'])
@login_required
def add_payment():
    """Log a payment"""
    db = get_db_session()
    
    # Verify tenant belongs to current user
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
        flash('Payment logged successfully!', 'success')
    except Exception as e:
        db.rollback()
        flash(f'Error logging payment: {str(e)}', 'danger')
    finally:
        db.close()
    
    return redirect(url_for('payments'))

@app.route('/export')
@login_required
def export_csv():
    """Export all data to CSV"""
    db = get_db_session()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(['Tenant', 'Property', 'Phone', 'Email', 'Monthly Rent', 'Due Day',
                     'Payment Month', 'Amount Paid', 'Payment Date', 'Method', 'Notes'])
    
    # Get all user's tenants and their payments
    tenants = db.query(Tenant).filter_by(user_id=current_user.id).all()
    for tenant in tenants:
        if tenant.payments:
            for payment in tenant.payments:
                writer.writerow([
                    tenant.name,
                    tenant.property_address,
                    tenant.phone,
                    tenant.email,
                    tenant.monthly_rent,
                    tenant.due_day,
                    payment.for_month,
                    payment.amount_paid,
                    payment.payment_date.strftime('%Y-%m-%d'),
                    payment.payment_method,
                    payment.notes
                ])
        else:
            # Tenant with no payments
            writer.writerow([
                tenant.name,
                tenant.property_address,
                tenant.phone,
                tenant.email,
                tenant.monthly_rent,
                tenant.due_day,
                'No payments', '', '', '', ''
            ])
    
    db.close()
    
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode()),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'rentkeepers_export_{date.today()}.csv'
    )

if __name__ == '__main__':
    try:
        app.run(debug=True, host='0.0.0.0', port=5000)
    finally:
        scheduler.shutdown()
