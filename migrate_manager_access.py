"""
Migration script to add ManagerAccess model to database
Run this once to enable property manager portal
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import Base, User, get_db_session
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import secrets

class ManagerAccess(Base):
    __tablename__ = 'manager_access'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    manager_email = Column(String(255), nullable=False)
    manager_name = Column(String(255), nullable=False)
    token = Column(String(64), unique=True, nullable=False)
    permissions = Column(String(500))  # Comma-separated permissions
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime)
    expires_at = Column(DateTime)

def run_migration():
    """Create ManagerAccess table"""
    print("Creating ManagerAccess table...")
    
    # Get database session
    db_session = get_db_session()
    try:
        # Create table
        Base.metadata.create_all(bind=db_session.get_bind())
        print("✅ ManagerAccess table created successfully!")
        
        # Create a test manager access for development
        print("\nCreating test manager access...")
        user = db_session.query(User).first()
        if user:
            # Create test manager access
            test_manager = ManagerAccess(
                user_id=user.id,
                manager_email='manager@example.com',
                manager_name='Test Manager',
                token=secrets.token_urlsafe(32),
                permissions='view_properties,view_tenants,view_payments,manage_maintenance,send_messages',
                active=True,
                expires_at=datetime.utcnow() + timedelta(days=365)
            )
            db_session.add(test_manager)
            db_session.commit()
            
            print(f"✅ Test manager access created!")
            print(f"   Token: {test_manager.token}")
            print(f"   URL: http://localhost:5173/manager/{test_manager.token}")
        else:
            print("⚠️  No users found. Create a user account first.")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        db_session.rollback()
        raise
    finally:
        db_session.close()

if __name__ == '__main__':
    run_migration()
