#!/usr/bin/env python3
"""
Database Migration Script
Adds missing columns to existing tables
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from models import init_db, get_db_session, engine, Base
from sqlalchemy import text

def migrate():
    db = get_db_session()
    
    print("🔧 Running database migrations...")
    
    try:
        # Add missing columns to maintenance_requests
        print("  - Adding is_message to maintenance_requests...")
        db.execute(text("ALTER TABLE maintenance_requests ADD COLUMN is_message BOOLEAN DEFAULT 0"))
        
        print("  - Adding photo_paths to maintenance_requests...")
        db.execute(text("ALTER TABLE maintenance_requests ADD COLUMN photo_paths TEXT"))
        
        # Add missing columns to tenants if needed
        print("  - Checking tenant columns...")
        try:
            db.execute(text("ALTER TABLE tenants ADD COLUMN lease_start DATE"))
            print("    + Added lease_start")
        except:
            print("    ✓ lease_start exists")
        
        try:
            db.execute(text("ALTER TABLE tenants ADD COLUMN lease_end DATE"))
            print("    + Added lease_end")
        except:
            print("    ✓ lease_end exists")
        
        try:
            db.execute(text("ALTER TABLE tenants ADD COLUMN security_deposit FLOAT"))
            print("    + Added security_deposit")
        except:
            print("    ✓ security_deposit exists")
        
        db.commit()
        print("✅ Migration complete!")
        
    except Exception as e:
        print(f"⚠️ Migration error (some columns may already exist): {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    migrate()
