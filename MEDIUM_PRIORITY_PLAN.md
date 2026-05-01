# Medium Priority Features Implementation Plan

## Status Check

### ✅ Already Implemented
**9. Expense Tracking** - Model exists, UI component exists
- Expense model in models.py ✅
- OwnerStatements.jsx has expense management ✅
- Categories: maintenance, insurance, taxes, utilities, management, repairs, cleaning, other ✅
- Tax deductible flag ✅
- **Missing:** API routes in app.py (need to add)

### ❌ To Implement

### 6. Online Rental Applications
**New feature needed**
- Create RentalApplication model
- Form with personal info, employment, rental history
- Store applications per property
- Admin review interface
- **Effort:** 2-3 hours

### 7. Recurring/Auto-Pay
**Stripe Subscription integration**
- Save tenant's card for recurring charges
- Charge automatically on due date each month
- Stripe SetupIntents + Subscriptions
- Tenant opt-in UI
- **Effort:** 3-4 hours

### 8. Tenant Screening
**Third-party API integration**
- Credit check integration (Stripe Identity or TransUnion)
- Criminal background check API
- Eviction history
- Screening report display
- **Effort:** 4-6 hours (depends on API)

### 10. Tax Reports (1099 Prep)
**Report generation**
- Query income/expenses by year
- Generate PDF report
- Categorize by 1099 categories
- Export to CSV for accountant
- **Effort:** 2-3 hours (use existing expense data)

---

## Implementation Order
1. **Expense Tracking API** (quickest, data foundation) - 1 hour
2. **Tax Reports** (uses expense data) - 2 hours
3. **Rental Applications** (standalone feature) - 3 hours
4. **Recurring/Auto-Pay** (Stripe integration) - 4 hours
5. **Tenant Screening** (requires API signup) - 6 hours

---

## Notes
- Expense Tracking is 90% done, just needs API routes
- Auto-pay requires Stripe webhook handling
- Tenant screening needs external API (Stripe Identity, Checkr, or TransUnion)
- Tax reports can use existing expense categories
