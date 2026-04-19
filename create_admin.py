#!/usr/bin/env python3
"""Create admin user for RentKeepers"""
from models import get_db_session, User, init_db

print("Updating database with admin column...")
init_db()

db = get_db_session()

# Create admin user
admin = db.query(User).filter_by(email='admin@rentkeepers.com').first()
if not admin:
    admin = User(
        email='admin@rentkeepers.com',
        is_admin=True,
        subscription_tier='lifetime',
        subscription_status='active',
        first_name='Admin'
    )
    admin.set_password('admin123')
    db.add(admin)
    db.commit()
    print("✅ Admin user created!")
    print("   Email: admin@rentkeepers.com")
    print("   Password: admin123")
else:
    # Ensure admin flag is set
    if not admin.is_admin:
        admin.is_admin = True
        db.commit()
    print("✅ Admin user already exists")

# Promote existing user to admin if needed
existing = db.query(User).filter_by(email='edge@example.com').first()
if existing and not existing.is_admin:
    existing.is_admin = True
    db.commit()
    print(f"✅ Promoted {existing.email} to admin")

db.close()
print("\nDone!")
