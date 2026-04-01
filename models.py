from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, func, Boolean
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from datetime import datetime
import os
from werkzeug.security import generate_password_hash, check_password_hash

Base = declarative_base()

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'rentkeepers.db')
engine = create_engine(f'sqlite:///{DATABASE_PATH}', echo=False)
Session = sessionmaker(bind=engine)

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Email reminder settings
    reminder_enabled = Column(Boolean, default=False)
    reminder_days_before = Column(Integer, default=3)  # Days before due date
    reminder_time = Column(String(5), default="09:00")  # HH:MM format
    
    tenants = relationship("Tenant", back_populates="user", cascade="all, delete-orphan")
    
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
    email = Column(String(120))  # For sending tenant reminders
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="tenants")
    payments = relationship("Payment", back_populates="tenant", cascade="all, delete-orphan")
    
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
    payment_method = Column(String(20))  # Venmo, Zelle, Check, Cash, etc.
    notes = Column(String(255))
    
    tenant = relationship("Tenant", back_populates="payments")
    user = relationship("User")
    
    def __repr__(self):
        return f"<Payment(${self.amount_paid} for {self.for_month})>"

def init_db():
    """Create all tables if they don't exist"""
    Base.metadata.create_all(engine)

def get_db_session():
    """Get a new database session"""
    return Session()
