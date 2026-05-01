# Home Page & 4-Tier Pricing Update

## Changes Made

### ✅ Added Home/Landing Page
- Full-width landing page with hero section
- Features showcase (4 key features)
- 4-tier pricing section
- Call-to-action sections
- Social media footer links

### ✅ Added Home Button to Navigation
- Home button visible for **guests only** (not logged in)
- Logged-in users see Dashboard instead
- Mobile-friendly (closes menu on navigation)

### ✅ 4 Pricing Tiers

| Tier | Price | Units | Key Features |
|------|-------|-------|--------------|
| **Free** | $0/mo | 2 units | Basic tracking, tenant management |
| **Starter** | $9/mo | 10 units | Email reminders, CSV export, 14-day trial |
| **Professional** | $29/mo | 50 units | PDF statements, auto-reports, priority support |
| **Enterprise** | $99/mo | Unlimited | Custom branding, API, dedicated support, SLA |

### ✅ Navigation Updates
- **Guests see:** Home | Login | Register
- **Logged-in users see:** Home (hidden) | Dashboard | Tenant | Payments | Account dropdown

## Files Modified

- `index.html` - Added home page section and navigation updates

## Testing

1. **Guest view** (not logged in):
   - Should see Home page by default
   - Home button in navbar
   - Can view pricing tiers
   - Can click "Get Started" → Register page

2. **Logged-in view**:
   - Should see Dashboard by default
   - Home button hidden
   - Full app functionality

## Next Steps (Optional)

- [ ] Connect pricing to actual Stripe checkout
- [ ] Add unit limits enforcement per tier
- [ ] Create upgrade flow from Free → Paid tiers
- [ ] Add testimonial section to home page
- [ ] Add FAQ section

## Launch

To see the changes:
1. Refresh the browser
2. Or navigate to `http://localhost:5000` (or your deployed URL)
3. You should see the new landing page!

---

**Updated:** 2026-04-22  
**By:** Bruv
