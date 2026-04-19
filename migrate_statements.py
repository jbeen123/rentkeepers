"""
Database Migration Script for Owner Statements Feature
Run this to add the new tables to your existing database
"""
import sys
import os

# Add the project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the existing models and engine
from models import Base, engine, get_db_session
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Date

def migrate():
    """Create new tables for owner statements feature"""
    
    print(f"Running migration on existing database...")
    
    # Define new tables (they'll use the same metadata as existing tables)
    
    class Expense(Base):
        __tablename__ = 'expenses'
        
        id = Column(Integer, primary_key=True)
        user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
        property_id = Column(Integer, ForeignKey('properties.id'), nullable=False)
        description = Column(String(255), nullable=False)
        category = Column(String(50), nullable=False)
        amount = Column(Float, nullable=False)
        expense_date = Column(Date, nullable=False)
        for_month = Column(String(7), nullable=True)
        vendor_name = Column(String(100), nullable=True)
        vendor_invoice = Column(String(100), nullable=True)
        is_tax_deductible = Column(Boolean, default=True)
        receipt_url = Column(String(500), nullable=True)
        created_at = Column(DateTime)
        updated_at = Column(DateTime)
    
    class CompanySettings(Base):
        __tablename__ = 'company_settings'
        
        id = Column(Integer, primary_key=True)
        user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True)
        company_name = Column(String(100), nullable=False, default='RentKeepers')
        company_address = Column(String(255), nullable=True)
        company_city = Column(String(100), nullable=True)
        company_state = Column(String(50), nullable=True)
        company_zip = Column(String(20), nullable=True)
        company_phone = Column(String(20), nullable=True)
        company_email = Column(String(120), nullable=True)
        company_website = Column(String(200), nullable=True)
        company_logo_url = Column(String(500), nullable=True)
        default_management_fee_percent = Column(Float, default=10.0)
        statement_footer_text = Column(Text, nullable=True)
        statement_payment_terms = Column(String(255), default='Payment will be processed within 2-3 business days.')
        statement_email_subject = Column(String(255), default='Your Monthly Owner Statement - {period}')
        statement_email_template = Column(Text, nullable=True)
        auto_send_statements = Column(Boolean, default=False)
        auto_send_day = Column(Integer, default=5)
        created_at = Column(DateTime)
        updated_at = Column(DateTime)
    
    class OwnerStatementRecord(Base):
        __tablename__ = 'owner_statements'
        
        id = Column(Integer, primary_key=True)
        user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
        property_id = Column(Integer, ForeignKey('properties.id'), nullable=False)
        month = Column(Integer, nullable=False)
        year = Column(Integer, nullable=False)
        total_income = Column(Float, default=0.0)
        total_expenses = Column(Float, default=0.0)
        management_fee = Column(Float, default=0.0)
        management_fee_percent = Column(Float, default=10.0)
        net_to_owner = Column(Float, default=0.0)
        pdf_filename = Column(String(255), nullable=True)
        pdf_path = Column(String(500), nullable=True)
        pdf_size = Column(Integer, nullable=True)
        status = Column(String(20), default='draft')
        email_sent = Column(Boolean, default=False)
        email_sent_at = Column(DateTime, nullable=True)
        email_recipients = Column(String(500), nullable=True)
        viewed_at = Column(DateTime, nullable=True)
        view_count = Column(Integer, default=0)
        generated_at = Column(DateTime)
        generated_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    class StatementEmailLog(Base):
        __tablename__ = 'statement_email_logs'
        
        id = Column(Integer, primary_key=True)
        statement_id = Column(Integer, ForeignKey('owner_statements.id'), nullable=False)
        recipient_email = Column(String(120), nullable=False)
        recipient_name = Column(String(100), nullable=True)
        subject = Column(String(255), nullable=False)
        body_preview = Column(Text, nullable=True)
        status = Column(String(20), default='sent')
        sent_at = Column(DateTime)
        opened_at = Column(DateTime, nullable=True)
        error_message = Column(Text, nullable=True)
    
    # Also add new column to existing Property table
    from sqlalchemy import inspect
    from sqlalchemy.exc import OperationalError
    
    inspector = inspect(engine)
    columns = [c['name'] for c in inspector.get_columns('properties')]
    
    if 'management_fee_percent' not in columns:
        print("Adding management_fee_percent column to properties table...")
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE properties ADD COLUMN management_fee_percent FLOAT DEFAULT 10.0"))
            conn.commit()
        print("  ✓ Column added")
    else:
        print("  ✓ management_fee_percent column already exists")
    
    # Create new tables
    print("\nCreating new tables...")
    Base.metadata.create_all(engine, tables=[
        Expense.__table__,
        CompanySettings.__table__,
        OwnerStatementRecord.__table__,
        StatementEmailLog.__table__
    ])
    
    print("\n✅ Migration complete!")
    print("\nNew tables created:")
    print("  - expenses (track property expenses)")
    print("  - company_settings (company branding & settings)")
    print("  - owner_statements (generated statement records)")
    print("  - statement_email_logs (email delivery tracking)")
    print("\nExisting tables updated:")
    print("  - properties (added management_fee_percent column)")
    
    # Verify migration
    tables = inspector.get_table_names()
    new_tables = ['expenses', 'company_settings', 'owner_statements', 'statement_email_logs']
    
    print("\nVerification:")
    for table in new_tables:
        status = "✓" if table in tables else "✗"
        print(f"  {status} {table}")

if __name__ == '__main__':
    migrate()
