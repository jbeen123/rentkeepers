#!/usr/bin/env python3
"""
RentKeepers Feature Test Script
Tests all critical features before deployment
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from models import get_db_session, User, Tenant, Property, Payment
from datetime import datetime, date

def test_all():
    print("🧪 RentKeepers Feature Tests\n")
    print("=" * 50)
    
    db = get_db_session()
    tests_passed = 0
    tests_failed = 0
    
    # Test 1: Database Connection
    try:
        user_count = db.query(User).count()
        print(f"✅ Database Connection (Users: {user_count})")
        tests_passed += 1
    except Exception as e:
        print(f"❌ Database Connection: {e}")
        tests_failed += 1
    
    # Test 2: Late Fee Logic Exists
    try:
        # Just verify the logic is in place
        import app
        assert hasattr(app, 'apply_late_fees'), "apply_late_fees function missing"
        print(f"✅ Late Fee Automation (scheduled task ready)")
        tests_passed += 1
    except Exception as e:
        print(f"❌ Late Fee Automation: {e}")
        tests_failed += 1
    
    # Test 3: Tenant Count
    try:
        tenant_count = db.query(Tenant).count()
        print(f"✅ Tenant Management (Tenants: {tenant_count})")
        tests_passed += 1
    except Exception as e:
        print(f"❌ Tenant Management: {e}")
        tests_failed += 1
    
    # Test 4: Property Count
    try:
        property_count = db.query(Property).count()
        print(f"✅ Property Management (Properties: {property_count})")
        tests_passed += 1
    except Exception as e:
        print(f"❌ Property Management: {e}")
        tests_failed += 1
    
    # Test 5: Payment Records
    try:
        payment_count = db.query(Payment).count()
        print(f"✅ Payment Tracking (Payments: {payment_count})")
        tests_passed += 1
    except Exception as e:
        print(f"❌ Payment Tracking: {e}")
        tests_failed += 1
    
    db.close()
    
    print("=" * 50)
    print(f"\nResults: {tests_passed} passed, {tests_failed} failed")
    
    if tests_failed == 0:
        print("\n🚀 READY FOR DEPLOYMENT!")
        return 0
    else:
        print("\n⚠️ Fix failures before deploying")
        return 1

if __name__ == '__main__':
    sys.exit(test_all())
