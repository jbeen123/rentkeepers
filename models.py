"""
RentKeepers Database Models
Flask-SQLAlchemy compatible models with fee tracking
"""
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, func, Boolean, Text, Date
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from datetime import datetime, timedelta
import os
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

load_dotenv()

Base = declarative_base()

# PostgreSQL for production, SQLite fallback for dev
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///rentkeepers.db')

# Handle Railway/Heroku postgres:// vs postgresql://
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

engine = create_engine(DATABASE_URL, echo=False)
Session = sessionmaker(bind=engine)


class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Subscription tier (free, premium, lifetime)
    subscription_tier = Column(String(20), default='free')  # free, monthly, yearly, lifetime
    subscription_status = Column(String(20), default='active')  # active, cancelled, past_due
    subscription_expires_at = Column(DateTime, nullable=True)
    
    # Stripe integration
    stripe_customer_id = Column(String(100), nullable=True)
    stripe_subscription_id = Column(String(100), nullable=True)
    
    # Crypto payment tracking
    pending_crypto_tx = Column(String(100), nullable=True)
    pending_crypto_amount = Column(Float, nullable=True)
    pending_crypto_currency = Column(String(10), nullable=True)
    
    # Payment processing settings
    card_fee_percentage = Column(Float, default=2.9)  # Landlord's fee rate
    card_fee_fixed = Column(Float, default=0.30)
    ach_fee_percentage = Column(Float, default=0.0)  # Usually free
    ach_fee_fixed = Column(Float, default=0.0)
    
    # Email reminder settings
    reminder_enabled = Column(Boolean, default=False)
    reminder_days_before = Column(Integer, default=3)
    reminder_time = Column(String(5), default="09:00")
    
    # 2FA TOTP settings
    totp_secret = Column(String(32), nullable=True)  # Encrypted TOTP secret
    totp_enabled = Column(Boolean, default=False)  # 2FA enabled flag
    totp_verified_at = Column(DateTime, nullable=True)  # When 2FA was last verified
    
    # Admin flag
    is_admin = Column(Boolean, default=False)
    
    # Tenant limits
    @property
    def max_tenants(self):
        if self.subscription_tier in ['monthly', 'yearly', 'lifetime']:
            return 999  # Unlimited
        return 3  # Free tier
    
    @property
    def max_properties(self):
        if self.subscription_tier in ['monthly', 'yearly', 'lifetime']:
            return 999  # Unlimited
        return 1  # Free tier: 1 property
    
    @property
    def can_add_tenant(self):
        return len(self.tenants) < self.max_tenants
    
    @property
    def can_add_property(self):
        return len(self.properties) < self.max_properties
    
    @property
    def subscription_display(self):
        tier_map = {
            'free': 'Free (3 tenants, 1 property)',
            'monthly': 'Premium Monthly',
            'yearly': 'Premium Yearly',
            'lifetime': 'Lifetime Access'
        }
        return tier_map.get(self.subscription_tier, 'Free')
    
    # Relationships
    tenants = relationship("Tenant", back_populates="user", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")
    properties = relationship("Property", back_populates="user", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="user", cascade="all, delete-orphan")
    company_settings = relationship("CompanySettings", back_populates="user", uselist=False)
    statements = relationship("OwnerStatementRecord", back_populates="user", cascade="all, delete-orphan")
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def is_authenticated(self):
        return True
    
    def is_active_status(self):
        return self.is_active
    
    def is_anonymous(self):
        return False
    
    def get_id(self):
        return str(self.id)
    
    def generate_totp_secret(self):
        """Generate a new TOTP secret"""
        import pyotp
        self.totp_secret = pyotp.random_base32()
        return self.totp_secret
    
    def verify_totp(self, token):
        """Verify a TOTP token"""
        import pyotp
        if not self.totp_secret or not self.totp_enabled:
            return True
        totp = pyotp.TOTP(self.totp_secret)
        return totp.verify(token, valid_window=1)
    
    def get_totp_uri(self):
        """Get provisioning URI for QR code"""
        import pyotp
        if not self.totp_secret:
            return None
        totp = pyotp.TOTP(self.totp_secret)
        return totp.provisioning_uri(
            name=self.email,
            issuer_name="RentKeepers"
        )


class Property(Base):
    """Multi-property support - landlords can have multiple properties"""
    __tablename__ = 'properties'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String(100), nullable=False)  # e.g., "Oak Street Duplex"
    address = Column(String(255), nullable=False)  # Full address
    city = Column(String(100))
    state = Column(String(50))
    zip_code = Column(String(20))
    
    # Property details
    property_type = Column(String(50))  # single_family, duplex, apartment, commercial
    bedrooms = Column(Float, nullable=True)
    bathrooms = Column(Float, nullable=True)
    square_footage = Column(Integer, nullable=True)
    year_built = Column(Integer, nullable=True)
    
    # Financial
    purchase_price = Column(Float, nullable=True)
    purchase_date = Column(Date, nullable=True)
    current_value = Column(Float, nullable=True)
    property_tax = Column(Float, nullable=True)
    insurance_cost = Column(Float, nullable=True)
    maintenance_budget = Column(Float, nullable=True)
    
    # Management fee settings
    management_fee_percent = Column(Float, default=10.0)
    
    # Status
    status = Column(String(20), default='active')  # active, sold, archived
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="properties")
    tenants = relationship("Tenant", back_populates="property_rel")
    expenses = relationship("Expense", back_populates="property_rel")
    statements = relationship("OwnerStatementRecord", back_populates="property_rel")
    
    @property
    def occupancy_rate(self):
        """Calculate current occupancy rate"""
        total_units = len(self.tenants) if self.property_type != 'single_family' else 1
        occupied = sum(1 for t in self.tenants if t.is_active)
        return (occupied / total_units * 100) if total_units > 0 else 0
    
    @property
    def monthly_income(self):
        """Total monthly rental income from this property"""
        return sum(t.monthly_rent for t in self.tenants)
    
    @property
    def annual_income(self):
        """Total annual rental income"""
        return self.monthly_income * 12


class Tenant(Base):
    __tablename__ = 'tenants'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    property_id = Column(Integer, ForeignKey('properties.id'), nullable=True)  # Optional property assignment
    name = Column(String(100), nullable=False)
    property_address = Column(String(255), nullable=False)  # Legacy, use property_id instead
    monthly_rent = Column(Float, nullable=False)
    due_day = Column(Integer, nullable=False)
    phone = Column(String(20))
    email = Column(String(120))
    
    # Lease details
    lease_start = Column(Date, nullable=True)
    lease_end = Column(Date, nullable=True)
    security_deposit = Column(Float, default=0.0)
    
    # Tenant portal
    portal_enabled = Column(Boolean, default=False)
    portal_token = Column(String(64), nullable=True)
    
    # Payment preferences
    preferred_payment_method = Column(String(20), default='card')  # card, ach, check
    card_last4 = Column(String(4), nullable=True)  # Last 4 digits of saved card
    stripe_customer_id = Column(String(100), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)  # False = former tenant
    moved_out_date = Column(Date, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="tenants")
    property_rel = relationship("Property", back_populates="tenants")
    payments = relationship("Payment", back_populates="tenant", cascade="all, delete-orphan")
    
    @property
    def total_paid_this_month(self):
        current_month = datetime.now().strftime('%Y-%m')
        return sum(p.amount_paid for p in self.payments if p.for_month == current_month)
    
    @property
    def is_paid_current(self):
        return self.total_paid_this_month >= self.monthly_rent


class Payment(Base):
    __tablename__ = 'payments'
    
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, ForeignKey('tenants.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Payment amounts
    amount_paid = Column(Float, nullable=False)  # What tenant actually paid
    rent_amount = Column(Float, nullable=False)  # Base rent amount
    fee_amount = Column(Float, default=0.0)  # Processing fee
    total_amount = Column(Float, nullable=False)  # amount_paid + fee_amount
    
    # Fee breakdown
    stripe_fee = Column(Float, default=0.0)  # Stripe's fee
    platform_fee = Column(Float, default=0.0)  # RentKeepers fee (if any)
    
    # Payment details
    for_month = Column(String(7), nullable=False)  # YYYY-MM
    payment_date = Column(DateTime, default=datetime.utcnow)
    payment_method = Column(String(20))  # card, ach, check, cash
    payment_type = Column(String(20), default='rent')  # rent, deposit, fee, other
    notes = Column(String(255))
    
    # Payment status
    status = Column(String(20), default='completed')  # pending, completed, failed, refunded
    
    # Stripe integration
    stripe_payment_intent_id = Column(String(100), nullable=True)
    stripe_charge_id = Column(String(100), nullable=True)
    
    # Refund tracking
    refunded_amount = Column(Float, default=0.0)
    refund_date = Column(DateTime, nullable=True)
    
    tenant = relationship("Tenant", back_populates="payments")
    user = relationship("User", back_populates="payments")


class Expense(Base):
    """Track property expenses for owner statements"""
    __tablename__ = 'expenses'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    property_id = Column(Integer, ForeignKey('properties.id'), nullable=False)
    
    # Expense details
    description = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False)  # maintenance, insurance, taxes, utilities, etc.
    amount = Column(Float, nullable=False)
    
    # Date tracking
    expense_date = Column(Date, nullable=False)
    for_month = Column(String(7), nullable=True)  # YYYY-MM format for recurring expenses
    
    # Vendor/contractor info
    vendor_name = Column(String(100), nullable=True)
    vendor_invoice = Column(String(100), nullable=True)
    
    # Status
    is_tax_deductible = Column(Boolean, default=True)
    receipt_url = Column(String(500), nullable=True)  # S3/file path
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="expenses")
    property_rel = relationship("Property", back_populates="expenses")


class CompanySettings(Base):
    """Company branding and settings for owner statements"""
    __tablename__ = 'company_settings'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True)
    
    # Company info for statements
    company_name = Column(String(100), nullable=False, default='RentKeepers')
    company_address = Column(String(255), nullable=True)
    company_city = Column(String(100), nullable=True)
    company_state = Column(String(50), nullable=True)
    company_zip = Column(String(20), nullable=True)
    company_phone = Column(String(20), nullable=True)
    company_email = Column(String(120), nullable=True)
    company_website = Column(String(200), nullable=True)
    
    # Logo
    company_logo_url = Column(String(500), nullable=True)
    
    # Statement settings
    default_management_fee_percent = Column(Float, default=10.0)
    statement_footer_text = Column(Text, nullable=True)
    statement_payment_terms = Column(String(255), default='Payment will be processed within 2-3 business days.')
    
    # Email settings for statements
    statement_email_subject = Column(String(255), default='Your Monthly Owner Statement - {period}')
    statement_email_template = Column(Text, nullable=True)
    
    # Auto-send settings
    auto_send_statements = Column(Boolean, default=False)
    auto_send_day = Column(Integer, default=5)  # Day of month to send
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="company_settings")


class OwnerStatementRecord(Base):
    """Track generated owner statements"""
    __tablename__ = 'owner_statements'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    property_id = Column(Integer, ForeignKey('properties.id'), nullable=False)
    
    # Statement period
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    
    # Financial summary (snapshot at generation time)
    total_income = Column(Float, default=0.0)
    total_expenses = Column(Float, default=0.0)
    management_fee = Column(Float, default=0.0)
    management_fee_percent = Column(Float, default=10.0)
    net_to_owner = Column(Float, default=0.0)
    
    # File info
    pdf_filename = Column(String(255), nullable=True)
    pdf_path = Column(String(500), nullable=True)
    pdf_size = Column(Integer, nullable=True)  # bytes
    
    # Status
    status = Column(String(20), default='draft')  # draft, generated, sent, viewed
    
    # Email tracking
    email_sent = Column(Boolean, default=False)
    email_sent_at = Column(DateTime, nullable=True)
    email_recipients = Column(String(500), nullable=True)  # comma-separated
    
    # View tracking
    viewed_at = Column(DateTime, nullable=True)
    view_count = Column(Integer, default=0)
    
    # Metadata
    generated_at = Column(DateTime, default=datetime.utcnow)
    generated_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="statements")
    property_rel = relationship("Property", back_populates="statements")


class StatementEmailLog(Base):
    """Log of sent statement emails"""
    __tablename__ = 'statement_email_logs'
    
    id = Column(Integer, primary_key=True)
    statement_id = Column(Integer, ForeignKey('owner_statements.id'), nullable=False)
    
    recipient_email = Column(String(120), nullable=False)
    recipient_name = Column(String(100), nullable=True)
    
    subject = Column(String(255), nullable=False)
    body_preview = Column(Text, nullable=True)
    
    status = Column(String(20), default='sent')  # sent, delivered, opened, bounced, failed
    sent_at = Column(DateTime)
    opened_at = Column(DateTime, nullable=True)
    
    # Error tracking
    error_message = Column(Text, nullable=True)


class Invoice(Base):
    """Generated invoices for tenants"""
    __tablename__ = 'invoices'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    tenant_id = Column(Integer, ForeignKey('tenants.id'), nullable=False)
    invoice_number = Column(String(50), unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    for_month = Column(String(7), nullable=False)
    due_date = Column(Date, nullable=False)
    
    status = Column(String(20), default='pending')
    sent_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    pdf_url = Column(String(500), nullable=True)
    
    tenant = relationship("Tenant")
    user = relationship("User")


class MaintenanceRequest(Base):
    """Track maintenance issues per property"""
    __tablename__ = 'maintenance_requests'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    property_id = Column(Integer, ForeignKey('properties.id'), nullable=True)
    tenant_id = Column(Integer, ForeignKey('tenants.id'), nullable=True)
    
    title = Column(String(200), nullable=False)
    description = Column(Text)
    priority = Column(String(20), default='medium')  # low, medium, high, emergency
    status = Column(String(20), default='open')  # open, in_progress, completed, cancelled
    
    estimated_cost = Column(Float, nullable=True)
    actual_cost = Column(Float, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = 'audit_logs'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    action = Column(String(50), nullable=False)
    resource_type = Column(String(50))
    resource_id = Column(Integer)
    details = Column(Text)
    ip_address = Column(String(45))
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    """Create all tables if they don't exist"""
    Base.metadata.create_all(engine)


def get_db_session():
    """Get a new database session"""
    return Session()


def log_action(user_id, action, resource_type=None, resource_id=None, details=None, ip_address=None):
    """Log an action to the audit log"""
    session = get_db_session()
    try:
        log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address
        )
        session.add(log)
        session.commit()
    finally:
        session.close()
