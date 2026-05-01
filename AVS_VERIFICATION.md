# 💳 Address Verification System (AVS) - Implementation

## ✅ What's Been Added

### Address Verification for Tenant Payments

When tenants pay rent with a credit/debit card, they must now provide their **billing address** for AVS verification through Stripe.

---

## 🔐 What is AVS?

**Address Verification System (AVS)** is a fraud prevention tool that:
- Compares the billing address entered by the tenant with the address on file at the card issuer
- Helps verify the person making the payment is the actual cardholder
- Reduces fraudulent transactions and chargebacks
- Provides liability protection for landlords

---

## 🎯 How It Works

### Tenant Experience

1. **Navigate to Pay Rent Tab** in tenant portal
2. **Enter Card Details:**
   - Card number
   - Expiry date
   - CVV

3. **Add Billing Address** (Required):
   - Click "+ Add Billing Address"
   - Enter complete address:
     - Street address
     - City
     - State
     - ZIP code
     - Country (US or Canada)

4. **Submit Payment:**
   - Stripe verifies address with card issuer
   - AVS check happens automatically
   - Payment processed if verification passes

### AVS Verification Results

Stripe checks two components:
- **Address Line 1** - Street address match
- **Postal Code** - ZIP code match

**Possible Results:**

| Result | Meaning | Action |
|--------|---------|--------|
| ✅ **Pass** | Both match | Payment proceeds normally |
| ⚠️ **Partial** | One matches | Payment may proceed with warning |
| ❌ **Fail** | Neither matches | Payment declined or flagged |
| ❓ **Unavailable** | Bank doesn't support AVS | Payment proceeds with notice |

---

## 📋 Implementation Details

### Frontend (React)

**File:** `web/src/pages/TenantPortal.jsx`

**Features Added:**
- Billing address form (collapsible)
- All 50 US states dropdown
- Country selection (US/Canada)
- Address validation before submission
- Visual confirmation when address is saved
- AVS information tooltip

**Form Fields:**
```javascript
{
  street: '123 Main St, Apt 4B',
  city: 'New York',
  state: 'NY',
  zip: '10001',
  country: 'US'
}
```

### Backend (Flask)

**File:** `tenant_portal_routes.py`

**Changes:**
1. Collect billing address from form
2. Validate all fields are present
3. Pass address to Stripe charge
4. Check AVS result codes
5. Store AVS status in payment notes
6. Handle AVS-specific errors

**Stripe Charge with AVS:**
```python
charge = stripe.Charge.create(
    amount=int(amount * 100),
    currency='usd',
    payment_method=payment_method,
    confirm=True,
    billing_details={
        'address': {
            'line1': billing_street,
            'city': billing_city,
            'state': billing_state,
            'postal_code': billing_zip,
            'country': billing_country
        }
    },
    expand=['payment_method_details.card.three_d_secure']
)
```

**AVS Check Results:**
```python
avs_result = charge.payment_method_details.card.address_line1_check
avs_postal = charge.payment_method_details.card.address_postal_code_check

# Results: 'pass', 'fail', 'unavailable', or None
```

---

## 🛡️ Security Benefits

### For Landlords

1. **Fraud Protection**
   - Verifies tenant is actual cardholder
   - Reduces unauthorized payments
   - Lower chargeback risk

2. **Liability Shift**
   - AVS verification shifts liability to card issuer
   - Better protection in disputes

3. **Payment Records**
   - AVS status stored with each payment
   - Evidence of verification in disputes
   - Complete audit trail

### For Tenants

1. **Secure Payments**
   - Extra layer of security
   - Protects against unauthorized use
   - Same verification as online shopping

2. **Privacy**
   - Address only used for verification
   - Not stored separately
   - Encrypted through Stripe

---

## 🧪 Testing AVS

### Stripe Test Cards with AVS

Use these test cards to verify AVS works:

**Standard Test Card:**
```
Card: 4242 4242 4242 4242
Expiry: Any future date
CVV: Any 3 digits
ZIP: Any 5 digits
```

**AVS Test Scenarios:**

| Test | Card | ZIP | Result |
|------|------|-----|--------|
| Pass | 4242... | 10001 | ✅ Both match |
| Fail | 4000 0000 0000 0002 | 00000 | ❌ Intentional failure |
| Partial | 4242... | 00000 | ⚠️ ZIP doesn't match |

### Test Flow

1. **Set up test tenant** with portal access
2. **Navigate to portal** → Pay Rent tab
3. **Enter billing address** when prompted
4. **Use test card** with different ZIP codes
5. **Verify AVS results** in payment notes

---

## 📊 AVS in Database

### Payment Record Example

```python
Payment(
    tenant_id=42,
    amount_paid=1200.00,
    payment_date=datetime.now(),
    for_month='2026-04',
    payment_method='Stripe',
    notes='Stripe charge: ch_3ABC123 | AVS: verified | Line1: pass | ZIP: pass'
)
```

### AVS Status Values

- `verified` - Both address and ZIP matched
- `failed` - One or both failed verification
- `unavailable` - Bank doesn't support AVS
- `partial` - Only one component matched

---

## ⚠️ Error Handling

### Common AVS Errors

**1. Address Line Incomplete**
```
Error: "address_line1_incomplete"
Message: "Billing address is incomplete. Please check and try again."
Solution: Ensure street address is complete (include apt/suite if applicable)
```

**2. Postal Code Invalid**
```
Error: "postal_code_invalid"
Message: "ZIP code is invalid. Please check and try again."
Solution: Verify ZIP code matches card issuer records
```

**3. Address Unverified**
```
Error: "address_unverified"
Message: "Address could not be verified. Please use the exact billing address from your card statement."
Solution: Tenant should check their card statement for exact address format
```

---

## 🎨 UI/UX Features

### Billing Address Form

**Design:**
- Collapsible section (saves space)
- Clear "Required" indicators
- State dropdown (all 50 states)
- Country selector (US/Canada)
- Save/Cancel buttons
- Success confirmation display

**User Flow:**
1. Click "+ Add Billing Address"
2. Form expands with all fields
3. Fill in complete address
4. Click "Save Address"
5. See confirmation with checkmark
6. Proceed with payment

**Visual Indicators:**
- 🔒 Required for verification badge
- ✅ Success confirmation (green)
- ⚠️ AVS information tooltip

---

## 📈 Best Practices

### For Landlords

1. **Require AVS for All Payments**
   - Enable by default
   - No bypass option
   - Consistent verification

2. **Review AVS Failures**
   - Check payment notes for AVS status
   - Contact tenant if verification fails
   - May indicate fraud attempt

3. **Keep Records**
   - AVS status stored in database
   - Useful for disputes
   - Shows due diligence

### For Tenants

1. **Use Exact Billing Address**
   - Match card statement exactly
   - Include apartment/suite numbers
   - Use correct ZIP code

2. **Update Address with Bank**
   - If recently moved, update with bank first
   - AVS checks bank records, not current address
   - Wait 24-48 hours after update

3. **Contact Landlord if Issues**
   - AVS failure doesn't always mean declined
   - Landlord can verify manually
   - Alternative payment methods available

---

## 🔧 Configuration

### Stripe Settings

No special configuration needed! AVS is:
- ✅ Enabled by default for all Stripe accounts
- ✅ Automatic for all card charges
- ✅ No additional fees
- ✅ Works with all card types

### Environment Variables

Ensure these are set in `.env`:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 📞 Support

### Tenant Issues

**"My payment was declined due to AVS"**
- Verify billing address matches card statement
- Check ZIP code is correct
- Contact bank if recently moved
- Try alternative payment method

**"I don't want to provide my address"**
- Explain AVS is required for security
- Same as any online purchase
- Address verified through bank, not stored
- Protects both tenant and landlord

### Landlord Issues

**"Should I accept payments with AVS failures?"**
- Review case-by-case
- May be legitimate (recent move, bank error)
- Contact tenant to verify
- Consider alternative payment method

**"How do I see AVS results?"**
- Check payment notes in database
- Look for "AVS:" in notes field
- Shows: verified/failed/unavailable
- Includes line1 and ZIP check results

---

## 🚀 Future Enhancements

### Phase 2 (Optional)
- [ ] 3D Secure authentication (additional verification)
- [ ] Save billing address for future payments
- [ ] Auto-fill from tenant profile
- [ ] AVS failure notifications to landlord
- [ ] AVS reporting dashboard
- [ ] Block payments with AVS failures (configurable)

---

**Implemented:** 2026-04-22  
**Version:** 1.0  
**Status:** ✅ Ready for Testing

---

## 🧪 Quick Test

1. **Go to tenant portal:** `http://localhost:5173/portal/test-token`
2. **Click "Pay Rent" tab**
3. **Click "+ Add Billing Address"**
4. **Fill in complete address**
5. **Use test card:** 4242 4242 4242 4242
6. **Submit payment**
7. **Check AVS result** in payment confirmation

**Address verification is now active!** 🎉
