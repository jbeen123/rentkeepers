# RentKeepers Deployment Guide
**Deploy to production in minutes**

---

## 🚀 Quick Deploy Options

Choose your platform:

| Platform | Difficulty | Cost | Best For |
|----------|-----------|------|----------|
| **Railway** | Easy | $5/mo+ | Full stack, PostgreSQL |
| **Render** | Easy | Free tier | Static + backend |
| **Vercel** | Easy | Free | Frontend only |
| **Heroku** | Medium | $7/mo+ | Traditional hosting |

---

## 🚂 Option 1: Railway (Recommended)

### Prerequisites
- Railway account: https://railway.app
- GitHub account

### Step 1: Connect Repository
```bash
# In Railway dashboard:
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your rentkeepers repository
4. Railway auto-detects Dockerfile
```

### Step 2: Add PostgreSQL
```
In Railway dashboard:
1. Click "New"
2. Select "Database" → "Add PostgreSQL"
3. Railway auto-sets DATABASE_URL
```

### Step 3: Configure Environment Variables
```
In Railway dashboard → Variables:

Required:
├── SECRET_KEY=(generate: python -c "import secrets; print(secrets.token_hex(32))")
├── DATABASE_URL=(auto-set by PostgreSQL)
├── STRIPE_SECRET_KEY=sk_live_...
├── STRIPE_PUBLISHABLE_KEY=pk_live_...
├── STRIPE_WEBHOOK_SECRET=whsec_...
└── STRIPE_PRICE_MONTHLY=price_...

Optional:
├── MAIL_SERVER=smtp.gmail.com
├── MAIL_USERNAME=...
├── MAIL_PASSWORD=...
├── MAIL_DEFAULT_SENDER=...
└── STRIPE_PRICE_YEARLY=price_...
```

### Step 4: Deploy
```bash
# Railway auto-deploys on git push
git push origin main

# Or manual deploy:
# Railway dashboard → Deployments → Deploy Latest
```

### Step 5: Get Domain
```
Railway dashboard → Settings → Domains
Copy: https://your-app.up.railway.app
```

### Step 6: Update Frontend
```bash
# web/.env.production
VITE_API_URL=https://your-app.up.railway.app

# Build and deploy frontend separately to Vercel
```

---

## 🎨 Option 2: Render

### Deploy Backend
```bash
# 1. Go to https://render.com
# 2. Click "New Web Service"
# 3. Connect GitHub repository
# 4. Configure:

Name: rentkeepers
Environment: Python 3
Build Command: pip install -r requirements.txt
Start Command: gunicorn --bind 0.0.0.0:$PORT app:app

# 5. Add environment variables (same as Railway)
# 6. Deploy!
```

### Deploy Frontend
```bash
# 1. In Render dashboard
# 2. Click "New Static Site"
# 3. Configure:

Name: rentkeepers-web
Build Command: cd web && npm install && npm run build
Publish Directory: web/dist

# 4. Environment:
VITE_API_URL=https://your-backend-url.onrender.com

# 5. Deploy!
```

---

## ▲ Option 3: Vercel (Frontend Only)

### Deploy Frontend to Vercel
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
cd web
vercel

# 3. Configure environment variables
vercel env add VITE_API_URL

# 4. Redeploy
vercel --prod
```

### Backend Still Needed
Deploy backend separately to Railway/Render, then:
```
VITE_API_URL=https://your-backend.railway.app
```

---

## 🧪 Pre-Deployment Checklist

### Environment Variables
```bash
# Backend (.env or platform dashboard)
SECRET_KEY=(generate new)
DATABASE_URL=(platform provides)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...
MAIL_SERVER=smtp.gmail.com
MAIL_USERNAME=...
MAIL_PASSWORD=...
```

### Frontend
```bash
# web/.env.production
VITE_API_URL=https://your-backend-url.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Stripe Webhook
```
1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: https://your-app.com/api/payments/webhook
3. Select events:
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - charge.refunded
4. Copy signing secret to STRIPE_WEBHOOK_SECRET
```

---

## 🔧 Deployment Scripts

### One-Click Deploy to Railway
```bash
# deploy-railway.sh
#!/bin/bash
set -e

echo "🚂 Deploying to Railway..."

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Login
railway login

# Link project
railway link

# Deploy
railway up

echo "✅ Deployed! Check dashboard for URL"
```

### Deploy Frontend to Vercel
```bash
# deploy-frontend.sh
#!/bin/bash
set -e

echo "▲ Deploying frontend to Vercel..."

cd web

# Install dependencies
npm install

# Build
npm run build

# Deploy
vercel --prod

echo "✅ Frontend deployed!"
```

---

## 🚨 Common Issues & Fixes

### "Database connection failed"
```bash
# Solution: Check DATABASE_URL format
# Should be: postgresql://user:pass@host:port/dbname

# Railway provides this automatically
# Render: Check connection string in dashboard
```

### "No module named 'reportlab'"
```bash
# Solution: Dependencies not installed
# Ensure requirements.txt includes:
reportlab==4.4.10

# Rebuild deployment
```

### "CORS errors in browser"
```bash
# Solution: Update CORS origins in app.py
CORS(app, supports_credentials=True, origins=[
    "http://localhost:5173",
    "https://your-production-domain.com"
])
```

### "Static files not loading"
```bash
# Solution: Serve static files properly
# Add to app.py:
from flask import send_from_directory

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)
```

---

## 🎉 Post-Deployment

### Verify Deployment
```bash
# Check backend health
curl https://your-app.com/

# Check API
curl https://your-app.com/api/dashboard

# Test payment (Stripe test mode)
# Go to your app and try paying with 4242 4242 4242 4242
```

### Monitor
- Railway dashboard: Metrics, logs, deployments
- Stripe dashboard: Payments, webhooks
- Application: User signups, payments

### Scale
```
Railway: Dashboard → Settings → Change plan
Render: Dashboard → Settings → Instance type
```

---

## 📚 Platform-Specific Guides

| Platform | Docs |
|----------|------|
| Railway | https://docs.railway.app |
| Render | https://render.com/docs |
| Vercel | https://vercel.com/docs |
| Heroku | https://devcenter.heroku.com |

---

## 💡 Pro Tips

1. **Start with Railway** - Easiest full-stack deployment
2. **Use test mode first** - Don't enable live Stripe immediately
3. **Set up monitoring** - Check logs daily first week
4. **Backup database** - Railway has automatic backups
5. **CDN for static** - Use Vercel for frontend assets

---

## 🆘 Emergency Commands

```bash
# Rollback deployment (Railway)
railway rollback

# View logs
railway logs

# Restart service
railway restart

# SSH into container (debug)
railway ssh
```

---

**Ready to deploy?** Pick Railway for easiest setup! 🚀

Run: `railway login` then `railway up`
