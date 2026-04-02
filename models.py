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
    
    # Status
    status = Column(String(20), default='active')  # active, sold, archived
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="properties")
    tenants = relationship("Tenant", back_populates="property")
    
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
    
    # Status
    is_active = Column(Boolean, default=True)  # False = former tenant
    moved_out_date = Column(Date, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="tenants")
    property = relationship("Property", back_populates="tenants")
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
    amount_paid = Column(Float, nullable=False)
    for_month = Column(String(7), nullable=False)
    payment_date = Column(DateTime, default=datetime.utcnow)
    payment_method = Column(String(20))
    notes = Column(String(255))
    
    # Stripe integration
    stripe_payment_intent_id = Column(String(100), nullable=True)
    
    tenant = relationship("Tenant", back_populates="payments")
    user = relationship("User", back_populates="payments")

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
    updated_at = DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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