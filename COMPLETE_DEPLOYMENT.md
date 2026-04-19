# Complete RentKeepers Deployment

## 🚀 Deployment Status

### ✅ Local Development
- Backend: Running on https://127.0.0.1:5000
- Frontend: Running on http://localhost:5173
- Status: **WORKING**

### ❌ Production Deployment
- Railway: **Needs Setup**
- Vercel: **Not Deployed**
- Database: **Needs PostgreSQL**

---

## 📋 Complete Deployment Steps

### Option 1: Manual Railway Deployment (Recommended)

#### Step 1: Login to Railway
```bash
railway login
```
This opens browser for authentication.

#### Step 2: Initialize Project
```bash
cd Projects/rentkeepers
railway init --name rentkeepers
```

#### Step 3: Add PostgreSQL Database
```
Railway Dashboard → New → Database → PostgreSQL
```

#### Step 4: Set Environment Variables
```
Railway Dashboard → rentkeepers → Variables

Required:
├── SECRET_KEY=python -c "import secrets; print(secrets.token_hex(32))"
├── DATABASE_URL=(auto-populated by PostgreSQL)
├── STRIPE_SECRET_KEY=sk_live_your_key
├── STRIPE_PUBLISHABLE_KEY=pk_live_your_key
└── STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

Optional:
├── MAIL_SERVER=smtp.gmail.com
├── MAIL_USERNAME=your_email@gmail.com
└── MAIL_PASSWORD=your_app_password
```

#### Step 5: Deploy
```bash
railway up
```

#### Step 6: Get Domain
```
Railway provides: https://rentkeepers-xxx.up.railway.app
```

---

### Option 2: One-Click Deploy Script

```bash
./DEPLOY_NOW.sh
```

This script will:
1. ✅ Check Railway CLI
2. ✅ Verify login
3. ✅ Initialize project
4. ✅ Prompt for environment variables
5. ✅ Deploy application

---

## 🎨 Frontend Deployment (Vercel)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Deploy
```bash
cd web
vercel --prod
```

### Step 3: Set Environment Variables
```
Vercel Dashboard → Project → Settings → Environment Variables

VITE_API_URL=https://your-railway-app.up.railway.app
```

---

## 🔧 Stripe Configuration

### 1. Get API Keys
```
https://dashboard.stripe.com → Developers → API Keys
```

### 2. Create Products
```
Products → Add Product
├── Premium Monthly: $29/month
└── Premium Yearly: $79/year
```

### 3. Set Webhook
```
Developers → Webhooks → Add Endpoint
URL: https://your-app.up.railway.app/api/payments/webhook
Events: payment_intent.succeeded, payment_intent.payment_failed
```

---

## 📊 Deployment Checklist

### Backend (Railway)
- [ ] Railway account created
- [ ] Project initialized
- [ ] PostgreSQL database added
- [ ] Environment variables set
- [ ] Code deployed
- [ ] Health check passing

### Frontend (Vercel)
- [ ] Vercel account created
- [ ] Project deployed
- [ ] API URL configured
- [ ] Domain configured

### Payments (Stripe)
- [ ] Stripe account activated
- [ ] Live API keys generated
- [ ] Products created
- [ ] Webhook configured
- [ ] Test payment successful

---

## 🚨 Troubleshooting

### "Database connection failed"
```bash
# Solution: Railway auto-creates DATABASE_URL
# Verify in Railway Dashboard → Variables
```

### "Stripe keys not working"
```bash
# Solution: Use LIVE keys (sk_live_, pk_live_)
# Test keys only work in test mode
```

### "CORS errors"
```bash
# Solution: Update allowed origins in app.py
# Add your production domain
```

---

## 🎯 What You'll Get

After deployment:
- 🌐 Website: https://your-domain.com
- 💳 Payments: Live Stripe integration
- 📧 Email: Automated notifications
- 💾 Database: PostgreSQL on Railway
- 🚀 CDN: Frontend on Vercel

---

## 💰 Expected Costs

| Service | Monthly Cost |
|---------|-------------|
| Railway (Starter) | $5 |
| PostgreSQL | Included |
| Vercel (Hobby) | Free |
| Stripe Fees | Per transaction |

---

## 🆘 Need Help?

### Run deployment script:
```bash
./DEPLOY_NOW.sh
```

### Or manually:
```bash
railway login
railway init --name rentkeepers
railway up
```

### Check status:
```bash
railway status
railway logs
```

---

**Ready to deploy?** Run `./DEPLOY_NOW.sh` or follow the manual steps above! 🚀
