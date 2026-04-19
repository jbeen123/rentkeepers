"""
Model Extensions for Owner Statements Feature
Add these to your existing models.py
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from models import Base  # Import your existing Base

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
    
    def __repr__(self):
        return f"<Expense({self.category}: ${self.amount})>"


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
    
    def __repr__(self):
        return f"<CompanySettings({self.company_name})>"


class OwnerStatementRecord(Base):
    """Track generated owner statements"""
    __tablename__ = 'owner_statements'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)  # Property manager
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
    
    def __repr__(self):
        return f"<OwnerStatement({self.property_id}: {self.month}/{self.year})>"


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
    sent_at = Column(DateTime, default=datetime.utcnow)
    opened_at = Column(DateTime, nullable=True)
    
    # Error tracking
    error_message = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<StatementEmailLog({self.recipient_email}: {self.status})>"


# Update existing Property model - add management_fee_percent and relationships
# Add this to your existing Property class in models.py:
# management_fee_percent = Column(Float, default=10.0)
# expenses = relationship("Expense", back_populates="property_rel")
# statements = relationship("OwnerStatementRecord", back_populates="property_rel")

# Update existing User model - add relationships
# Add this to your existing User class in models.py:
# expenses = relationship("Expense", back_populates="user", cascade="all, delete-orphan")
# company_settings = relationship("CompanySettings", back_populates="user", uselist=False)
# statements = relationship("OwnerStatementRecord", back_populates="user", cascade="all, delete-orphan")
