"""
High Priority Features - Database Migration Script
Run this to add new columns to existing database
"""
import sqlite3
from datetime import datetime

DB_PATH = 'rentkeepers.db'

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("Starting migration...")
    
    # 1. Add lease document path to tenants
    try:
        cursor.execute("ALTER TABLE tenants ADD COLUMN lease_document_path TEXT")
        print("✓ Added lease_document_path to tenants")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("⊘ lease_document_path already exists")
        else:
            raise
    
    # 2. Add late fee settings to tenants
    for col in ['late_fee_enabled', 'late_fee_type', 'late_fee_amount', 'grace_period_days']:
        try:
            if col == 'late_fee_enabled':
                cursor.execute(f"ALTER TABLE tenants ADD COLUMN {col} INTEGER DEFAULT 0")
            elif col == 'late_fee_amount':
                cursor.execute(f"ALTER TABLE tenants ADD COLUMN {col} REAL DEFAULT 0.0")
            elif col == 'grace_period_days':
                cursor.execute(f"ALTER TABLE tenants ADD COLUMN {col} INTEGER DEFAULT 5")
            else:
                cursor.execute(f"ALTER TABLE tenants ADD COLUMN {col} TEXT DEFAULT 'flat'")
            print(f"✓ Added {col} to tenants")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print(f"⊘ {col} already exists")
            else:
                raise
    
    # 3. Add late fee tracking to payments
    for col in ['late_fee_applied', 'late_fee_amount']:
        try:
            if col == 'late_fee_applied':
                cursor.execute(f"ALTER TABLE payments ADD COLUMN {col} INTEGER DEFAULT 0")
            else:
                cursor.execute(f"ALTER TABLE payments ADD COLUMN {col} REAL DEFAULT 0.0")
            print(f"✓ Added {col} to payments")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print(f"⊘ {col} already exists")
            else:
                raise
    
    # 4. Add photo_paths to maintenance_requests
    try:
        cursor.execute("ALTER TABLE maintenance_requests ADD COLUMN photo_paths TEXT")
        print("✓ Added photo_paths to maintenance_requests")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("⊘ photo_paths already exists")
        else:
            raise
    
    conn.commit()
    conn.close()
    print("\n✅ Migration complete!")

if __name__ == '__main__':
    migrate()
