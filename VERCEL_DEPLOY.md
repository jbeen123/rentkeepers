# Deploy RentKeepers to Vercel (Static Version)

## Quick Deploy

**Option 1: One-Click Button**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjbeen123%2Frentkeepers%2Ftree%2Fmain%2Fstatic-version)

**Option 2: Manual**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `jbeen123/rentkeepers`
3. Set **Root Directory** to `static-version`
4. Deploy

## What's Included

This is a **browser-only** version that:
- ✅ Works entirely in the browser (no server needed)
- ✅ Stores data in IndexedDB (persists across sessions)
- ✅ Supports unlimited tenants
- ✅ Export/import JSON backups
- ⚠️ No email reminders (browser can't send email)
- ⚠️ No Stripe payments (static site)

## Limitations vs Railway Version

| Feature | Vercel (Static) | Railway (Full) |
|---------|-----------------|----------------|
| Database | Browser only | PostgreSQL |
| Email | ❌ | ✅ |
| Stripe | ❌ | ✅ |
| Real-time sync | ❌ | ✅ |
| Cost | Free | ~$5/mo |

## When to Use Vercel

- ✅ Testing/prototyping
- ✅ Personal use (1 landlord)
- ✅ No credit card needed
- ❌ Not for production SaaS

## Data Backup

**Export regularly!** Data is in browser storage:
- Go to Tenants → Export
- Download JSON file
- Store safely (Google Drive, etc.)

To restore: Import JSON file

---

**For full features, use Railway deployment.**