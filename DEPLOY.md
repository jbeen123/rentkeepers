# 🚀 RentKeepers Deployment Guide

## Quick Deploy (5 minutes)

### Option 1: Render (Recommended)

1. **Fork the repo** (or connect your GitHub)

2. **Create New Web Service on Render:**
   - Name: `rentkeepers`
   - Region: `New York (USA)`
   - Branch: `main`
   - Root Directory: `Projects/rentkeepers`
   - Runtime: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app`

3. **Add PostgreSQL Database:**
   - Click "Add Database" → "New PostgreSQL"
   - Name: `rentkeepers-db`
   - Region: Same as web service

4. **Set Environment Variables:**
```
SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(32))">
DATABASE_URL=<from Render database dashboard>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your@gmail.com
MAIL_PASSWORD=your-app-password
```

5. **Deploy!**
   - Click "Create Web Service"
   - Wait 3-5 minutes
   - Your app is live!

---

### Option 2: Railway

1. **Connect GitHub** to Railway
2. **Deploy from repo**
3. **Add PostgreSQL plugin**
4. **Set env vars** (same as above)
5. **Deploy**

---

### Option 3: Vercel (Not Recommended)
Vercel is for frontend. Use Render/Railway for Flask.

---

## Post-Deployment Checklist

- [ ] Test user registration
- [ ] Test login/logout
- [ ] Test payment processing (Stripe test mode)
- [ ] Test email sending
- [ ] Check error logs
- [ ] Set up custom domain (optional)
- [ ] Enable HTTPS (automatic on Render)
- [ ] Set up backups (Render auto-backs up)

---

## Environment Variables Reference

```bash
# Required
SECRET_KEY=
DATABASE_URL=
FLASK_ENV=production

# Stripe (for payments)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Email (for reminders)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_USE_TLS=True

# Crypto Wallets (optional)
BTC_WALLET=
ETH_WALLET=
USDC_WALLET=

# Security
RATELIMIT_ENABLED=True
SESSION_COOKIE_SECURE=True
```

---

## Troubleshooting

**App won't start:**
- Check logs in Render dashboard
- Verify DATABASE_URL is set
- Check requirements.txt has all dependencies

**Database errors:**
- Run migrations: `python migrate_database.py`
- Check DATABASE_URL format

**Payment errors:**
- Verify Stripe keys are correct
- Check Stripe dashboard for errors
- Use test keys first

---

## Cost Estimate

- **Render Free Tier:** $0 (limited hours)
- **Render Starter:** $7/month (24/7 uptime)
- **PostgreSQL:** Free tier available
- **Total:** $7-15/month to start

---

**Ready to deploy?** Run: `./deploy.sh`

**Questions?** Check logs: Render Dashboard → Logs
