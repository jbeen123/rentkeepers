# Stripe Setup Guide for RentKeepers

## 🚀 Quick Start (Test Mode)

### Step 1: Create Stripe Account
1. Go to https://stripe.com
2. Sign up for free account
3. Verify email
4. Complete basic profile

### Step 2: Get API Keys

**Dashboard → Developers → API Keys**

You'll see:
- `Publishable key` (starts with `pk_test_`)
- `Secret key` (starts with `sk_test_`)

### Step 3: Update .env File

```bash
# Open .env file
nano .env

# Add these lines (replace with your actual keys)
STRIPE_SECRET_KEY=sk_test_51H...your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_51H...your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_...your_webhook_secret

# Create subscription prices in Stripe Dashboard first, then add:
STRIPE_PRICE_MONTHLY=price_1H...monthly_price_id
STRIPE_PRICE_YEARLY=price_1H...yearly_price_id
```

### Step 4: Update Frontend Environment

```bash
# Open web/.env.local
nano web/.env.local

# Add:
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51H...your_publishable_key
```

### Step 5: Create Stripe Products/Prices

**In Stripe Dashboard:**
1. Go to "Products"
2. Click "Add product"
3. Create "Premium Monthly" - $29/month
4. Create "Premium Yearly" - $79/year
5. Copy the Price IDs to your .env

---

## 🧪 Testing

### Test Cards (from Stripe docs)

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | ✅ Success |
| `4000 0000 0000 9995` | ❌ Declined |
| `4000 0000 0000 3220` | 3D Secure required |

**Use any future date for expiry**
**Use any 3 digits for CVC**
**Use any ZIP code**

### Test Payment Flow
```
1. Go to http://localhost:5173/dashboard
2. Click "Pay Now" on any tenant
3. Select "Credit/Debit Card"
4. Enter: 4242 4242 4242 4242
5. Any future date, any CVC
6. Click "Pay"
7. Payment should succeed!
```

---

## 🔒 Webhook Setup (Required for Production)

### Local Testing with Stripe CLI

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5000/api/payments/webhook

# This gives you the webhook secret
# whsec_...your_webhook_secret
```

### Production Webhook

**In Stripe Dashboard:**
1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://yourdomain.com/api/payments/webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy signing secret to .env

---

## 💰 Fee Structure (Automatic)

RentKeepers calculates fees automatically:

### For Tenants (Rent Payments)
- **Credit/Debit Card:** 2.9% + $0.30
- **Bank Transfer (ACH):** FREE

### For Landlords (Subscriptions)
- **Premium Monthly:** $29/month
- **Premium Yearly:** $79/year
- **Lifetime:** $499 one-time

---

## 📊 Monitoring Payments

### Stripe Dashboard
- View all payments: https://dashboard.stripe.com/payments
- Refund payments
- Handle disputes
- Export reports

### In Your App
```python
# Get payment history
GET /api/payments/history/<tenant_id>

# Response
{
  "payments": [
    {
      "id": 1,
      "amount_paid": 1000.00,
      "fee_amount": 29.30,
      "for_month": "2025-03",
      "payment_method": "card",
      "status": "completed"
    }
  ]
}
```

---

## 🚨 Troubleshooting

### "No API key provided"
```bash
# Solution: Add keys to .env
export STRIPE_SECRET_KEY=sk_test_...
```

### "Invalid signature" (Webhook)
```bash
# Solution: Get correct webhook secret
stripe listen --forward-to localhost:5000/api/payments/webhook
# Copy the whsec_... from output
```

### "Payment method not available"
```bash
# Solution: Check Stripe account is activated
# Go to Stripe Dashboard → Settings → Account settings
# Complete business profile
```

---

## 🎯 Go Live Checklist

### Test Mode ✅
- [ ] Create Stripe account
- [ ] Get test API keys
- [ ] Update .env files
- [ ] Test payment flow
- [ ] Verify webhook working
- [ ] Test failed payments

### Live Mode 🚀
- [ ] Activate Stripe account (submit business details)
- [ ] Get live API keys (pk_live_, sk_live_)
- [ ] Update .env with live keys
- [ ] Create live products/prices
- [ ] Set up production webhook
- [ ] Test with real card (small amount)
- [ ] Monitor first transactions

---

## 🔗 Useful Links

- Stripe Dashboard: https://dashboard.stripe.com
- API Docs: https://stripe.com/docs/api
- Test Cards: https://stripe.com/docs/testing
- Webhooks: https://stripe.com/docs/webhooks

---

## 💡 Tips

1. **Start with test mode** - Never test with real money
2. **Use Stripe CLI** - Makes webhook testing easy
3. **Monitor dashboard** - Keep eye on failed payments
4. **Set up alerts** - Get notified of disputes/issues
5. **Keep secrets safe** - Never commit keys to git

---

**Need help?** Stripe support: https://support.stripe.com
