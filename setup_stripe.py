#!/usr/bin/env python3
"""
Stripe Setup Helper for RentKeepers
Generates configuration and provides setup instructions
"""

import os
import secrets

def generate_stripe_config():
    """Generate Stripe configuration template"""
    
    print("=" * 60)
    print("STRIPE SETUP HELPER")
    print("=" * 60)
    print()
    
    # Check current .env
    env_path = '.env'
    web_env_path = 'web/.env.local'
    
    print("📋 SETUP INSTRUCTIONS")
    print("-" * 60)
    print()
    print("1. Go to https://stripe.com and create a free account")
    print("2. Verify your email address")
    print("3. Go to Dashboard → Developers → API Keys")
    print("4. Copy your test keys (starts with pk_test_ and sk_test_)")
    print()
    
    # Read current .env
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            content = f.read()
        
        # Check if Stripe keys are already set
        if 'STRIPE_SECRET_KEY=sk' in content or 'STRIPE_PUBLISHABLE_KEY=pk' in content:
            print("⚠️  Stripe keys already found in .env")
            print("Run this script again only if you need to update keys")
            print()
    
    # Show what needs to be added
    print("📝 Add these lines to your .env file:")
    print("-" * 60)
    print()
    print("# Stripe Configuration")
    print("STRIPE_SECRET_KEY=sk_test_your_secret_key_here")
    print("STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here")
    print("STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here")
    print()
    print("# Create these in Stripe Dashboard → Products")
    print("STRIPE_PRICE_MONTHLY=price_your_monthly_price_id")
    print("STRIPE_PRICE_YEARLY=price_your_yearly_price_id")
    print()
    
    print("📝 Add this line to web/.env.local:")
    print("-" * 60)
    print()
    print("VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here")
    print()
    
    print("=" * 60)
    print("TEST CARDS (from Stripe documentation)")
    print("=" * 60)
    print()
    print("✅ Success:")
    print("  4242 4242 4242 4242")
    print("  Any future date, any 3-digit CVC, any ZIP")
    print()
    print("❌ Declined:")
    print("  4000 0000 0000 9995")
    print()
    print("🔄 Requires 3D Secure:")
    print("  4000 0000 0000 3220")
    print()
    
    print("=" * 60)
    print("NEXT STEPS")
    print("=" * 60)
    print()
    print("1. Sign up at https://stripe.com")
    print("2. Get your API keys from Dashboard → Developers → API Keys")
    print("3. Update .env and web/.env.local files")
    print("4. Create products in Stripe Dashboard:")
    print("   - Premium Monthly ($29/month)")
    print("   - Premium Yearly ($79/year)")
    print("   - Copy price IDs to .env")
    print("5. Start your servers:")
    print("   python app.py")
    print("   cd web && npm run dev")
    print("6. Test payment at http://localhost:5173/dashboard")
    print()
    print("📚 Full guide: STRIPE_SETUP.md")
    print()

if __name__ == '__main__':
    generate_stripe_config()
