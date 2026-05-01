"""
Advanced Features Migration
Adds insurance tracking, credit reporting fields
"""
import sqlite3

DB_PATH = 'rentkeepers.db'

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("Running advanced features migration...")
    
    # Insurance tracking
    insurance_cols = [
        ('insurance_required', 'INTEGER DEFAULT 0'),
        ('insurance_provider', 'TEXT'),
        ('insurance_policy_number', 'TEXT(50)'),
        ('insurance_expiry_date', 'DATE'),
        ('insurance_verified', 'INTEGER DEFAULT 0'),
        ('insurance_document_path', 'TEXT'),
    ]
    
    for col, dtype in insurance_cols:
        try:
            cursor.execute(f"ALTER TABLE tenants ADD COLUMN {col} {dtype}")
            print(f"✓ Added {col} to tenants")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print(f"⊘ {col} already exists")
            else:
                raise
    
    # Credit reporting
    credit_cols = [
        ('credit_reporting_enabled', 'INTEGER DEFAULT 0'),
        ('credit_report_consent', 'INTEGER DEFAULT 0'),
        ('credit_bureau_id', 'TEXT(100)'),
    ]
    
    for col, dtype in credit_cols:
        try:
            cursor.execute(f"ALTER TABLE tenants ADD COLUMN {col} {dtype}")
            print(f"✓ Added {col} to tenants")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print(f"⊘ {col} already exists")
            else:
                raise
    
    conn.commit()
    conn.close()
    print("\n✅ Advanced features migration complete!")

if __name__ == '__main__':
    migrate()
