#!/usr/bin/env python3
"""
Test script for RentKeepers 2FA functionality
"""

import sys
import os
sys.path.insert(0, '/home/jahffy/.openclaw/workspace/Projects/rentkeepers')

os.chdir('/home/jahffy/.openclaw/workspace/Projects/rentkeepers')

from models import User, init_db, get_db_session
import pyotp

print("=" * 60)
print("RENTKEEPERS 2FA TEST SUITE")
print("=" * 60)

# Test 1: Database Schema
print("\n1. Testing database schema...")
try:
    init_db()
    print("   ✅ Database initialized with new TOTP columns")
except Exception as e:
    print(f"   ❌ Failed: {e}")
    sys.exit(1)

# Test 2: User Model TOTP Methods
print("\n2. Testing User TOTP methods...")
try:
    db = get_db_session()
    user = User()
    user.email = "test@example.com"
    user.set_password("testpass123")
    
    # Generate secret
    secret = user.generate_totp_secret()
    assert len(secret) == 32, "Secret should be 32 chars"
    print(f"   ✅ Generated TOTP secret ({secret[:8]}...)")
    
    # Get provisioning URI
    uri = user.get_totp_uri()
    assert "otpauth://totp/RentKeepers:" in uri
    print(f"   ✅ Provisioning URI generated")
    
    # Verify token (with 2FA enabled)
    user.totp_enabled = True
    totp = pyotp.TOTP(secret)
    token = totp.now()
    assert user.verify_totp(token) == True, "Should verify valid token"
    print(f"   ✅ Valid token verified")
    
    # Reject invalid token (with 2FA enabled)
    assert user.verify_totp("000000") == False, "Should reject invalid token"
    print("   ✅ Invalid token rejected")
    
    # Test when 2FA disabled - should bypass
    user.totp_enabled = False
    assert user.verify_totp("anytoken") == True, "Should bypass when disabled"
    print("   ✅ 2FA bypass when disabled")
    
    db.close()
    print("   ✅ All TOTP methods working")
except Exception as e:
    print(f"   ❌ Failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 3: Verify templates exist
print("\n3. Checking templates...")
templates_dir = "/home/jahffy/.openclaw/workspace/Projects/rentkeepers/templates"
required_templates = [
    "verify_2fa.html",
    "setup_2fa.html"
]
for template in required_templates:
    path = os.path.join(templates_dir, template)
    if os.path.exists(path):
        print(f"   ✅ {template}")
    else:
        print(f"   ❌ Missing: {template}")
        sys.exit(1)

# Test 4: Check settings template has 2FA section
print("\n4. Checking settings.html 2FA integration...")
with open(os.path.join(templates_dir, "settings.html"), "r") as f:
    content = f.read()
    if "setup_2fa" in content and "disable_2fa" in content:
        print("   ✅ Settings page has 2FA controls")
    else:
        print("   ❌ Settings page missing 2FA controls")
        sys.exit(1)

# Test 5: Check requirements
print("\n5. Checking dependencies...")
with open("/home/jahffy/.openclaw/workspace/Projects/rentkeepers/requirements.txt", "r") as f:
    req_content = f.read()
    if "pyotp" in req_content:
        print("   ✅ pyotp in requirements.txt")
    else:
        print("   ❌ pyotp missing from requirements.txt")
        sys.exit(1)
    if "qrcode" in req_content:
        print("   ✅ qrcode in requirements.txt")
    else:
        print("   ❌ qrcode missing from requirements.txt")
        sys.exit(1)

print("\n" + "=" * 60)
print("ALL TESTS PASSED ✅")
print("=" * 60)
print("\n2FA Implementation Summary:")
print("  • Database: Added totp_secret, totp_enabled, totp_verified_at columns")
print("  • Routes: /verify-2fa, /setup-2fa, /disable-2fa")
print("  • Templates: verify_2fa.html, setup_2fa.html")
print("  • Login flow: Redirects to 2FA verification when enabled")
print("  • Settings: Toggle 2FA from settings page")
print("=" * 60)
