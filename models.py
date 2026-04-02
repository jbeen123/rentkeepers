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
    
    # Email reminder settings
    reminder_enabled = Column(Boolean, default=False)
    reminder_days_before = Column(Integer, default=3)
    reminder_time = Column(String(5), default="09:00")
    
    # Tenant limits
    @property
    def max_tenants(self):
        if self.subscription_tier in ['monthly', 'yearly', 'lifetime']:
            return 999  # Unlimited
        return 3  # Free tier
    
    @property
    def can_add_tenant(self):
        return len(self.tenants) < self.max_tenants
    
    @property
    def subscription_display(self):
        tier_map = {
            'free': 'Free (3 tenants)',
            'monthly': 'Premium Monthly',
            'yearly': 'Premium Yearly',
            'lifetime': 'Lifetime Access'
        }
        return tier_map.get(self.subscription_tier, 'Free')
    
    tenants = relationship("Tenant", back_populates="user", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def is_authenticated(self):
        return True
    
    def is_active(self):
        return self.is_active
    
    def is_anonymous(self):
        return False
    
    def get_id(self):
        return str(self.id)

class Tenant(Base):
    __tablename__ = 'tenants'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String(100), nullable=False)
    property_address = Column(String(255), nullable=False)
    monthly_rent = Column(Float, nullable=False)
    due_day = Column(Integer, nullable=False)  # Day of month (1-31)
    phone = Column(String(20))
    email = Column(String(120))
    
    # Property details
    lease_start = Column(Date, nullable=True)
    lease_end = Column(Date, nullable=True)
    security_deposit = Column(Float, default=0.0)
    
    # Tenant portal access (for future feature)
    portal_enabled = Column(Boolean, default=False)
    portal_token = Column(String(64), nullable=True)  # For magic link login
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="tenants")
    payments = relationship("Payment", back_populates="tenant", cascade="all, delete-orphan")
    
    @property
    def total_paid_this_month(self):
        current_month = datetime.now().strftime('%Y-%m')
        return sum(p.amount_paid for p in self.payments if p.for_month == current_month)
    
    @property
    def is_paid_current(self):
        return self.total_paid_this_month >= self.monthly_rent
    
    def __repr__(self):
        return f"<Tenant(name='{self.name}', property='{self.property_address}')>"

class Payment(Base):
    __tablename__ = 'payments'
    
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, ForeignKey('tenants.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    amount_paid = Column(Float, nullable=False)
    for_month = Column(String(7), nullable=False)  # Format: "2026-03"
    payment_date = Column(DateTime, default=datetime.utcnow)
    payment_method = Column(String(20))  # Venmo, Zelle, Check, Cash, ACH, Stripe
    notes = Column(String(255))
    
    # Stripe integration
    stripe_payment_intent_id = Column(String(100), nullable=True)
    
    tenant = relationship("Tenant", back_populates="payments")
    user = relationship("User", back_populates="payments")
    
    def __repr__(self):
        return f"<Payment(${self.amount_paid} for {self.for_month})>"

class Invoice(Base):
    """For generated invoices sent to tenants"""
    __tablename__ = 'invoices'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    tenant_id = Column(Integer, ForeignKey('tenants.id'), nullable=False)
    invoice_number = Column(String(50), unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    for_month = Column(String(7), nullable=False)
    due_date = Column(Date, nullable=False)
    
    status = Column(String(20), default='pending')  # pending, paid, overdue, cancelled
    sent_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    
    # PDF storage (URL to stored file)
    pdf_url = Column(String(500), nullable=True)
    
    tenant = relationship("Tenant")
    user = relationship("User")

class AuditLog(Base):
    """Track important actions for compliance"""
    __tablename__ = 'audit_logs'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    action = Column(String(50), nullable=False)  # LOGIN, LOGOUT, PAYMENT_ADDED, etc.
    resource_type = Column(String(50))  # tenant, payment, etc.
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