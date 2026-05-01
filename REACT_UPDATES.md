# React App Updates - 4-Tier Pricing & Home Button

## Files Modified

### 1. `/web/src/pages/Pricing.jsx`
- ✅ Updated from 3 tiers to **4 tiers**
- ✅ New pricing structure:
  - **Free** - $0/mo (2 units)
  - **Starter** - $9/mo (10 units) ⭐ Most Popular
  - **Professional** - $29/mo (50 units)
  - **Enterprise** - $99/mo (Unlimited) → Contact Sales button

### 2. `/web/src/pages/LandingPage.jsx`
- ✅ Updated pricing section from 3 to **4 tiers**
- ✅ Changed grid layout to `lg:grid-cols-4` (4 columns)
- ✅ Enterprise plan opens email link (sales@rentkeepers.com)

### 3. `/web/src/components/Layout.jsx`
- ✅ Added **Home button** to navigation
- ✅ Home button visible for all logged-in users
- ✅ Links to landing page (`/`)

## Changes Summary

| Component | Before | After |
|-----------|--------|-------|
| Pricing Tiers | 3 (Free, Monthly, Yearly, Lifetime) | 4 (Free, Starter, Pro, Enterprise) |
| Navigation | Dashboard, Tenants, Properties, Payments, Statements | **Home**, Dashboard, Tenants, Properties, Payments, Statements |
| Landing Page Grid | 3 columns | 4 columns |

## Testing

1. **Refresh your browser** at `http://localhost:5173/`
   - Hard refresh: `Ctrl+Shift+R` (Linux/Windows) or `Cmd+Shift+R` (Mac)

2. **Check Landing Page** (`/`):
   - Should see 4 pricing tiers
   - Enterprise button should open email client

3. **Check Pricing Page** (`/pricing`):
   - Should see 4 pricing tiers
   - Enterprise button should open email client

4. **Check Navigation** (when logged in):
   - Should see **Home** button next to Dashboard

## Vite Dev Server

The Vite dev server should auto-reload with these changes. If you don't see updates:

```bash
# Stop the dev server (Ctrl+C)
# Then restart:
cd /home/jahffy/.openclaw/workspace/Projects/rentkeepers/web
npm run dev
```

---

**Updated:** 2026-04-22 13:15  
**By:** Bruv
