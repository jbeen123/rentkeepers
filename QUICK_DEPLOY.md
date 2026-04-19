# 🚀 Deploy RentKeepers Now

## ⚡ Quick Start (5 minutes)

### Option 1: Railway (Recommended - Easiest)
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Link project
railway link

# 4. Deploy!
railway up
```

### Option 2: Use Our Script
```bash
./deploy.sh railway
```

---

## 📋 Before You Deploy

### ✅ Required (Must have)
- [ ] Railway/Render/Vercel account
- [ ] GitHub repository connected
- [ ] PostgreSQL database (Railway auto-adds)

### 🔑 Environment Variables (Add these)
```
SECRET_KEY=your_generated_secret
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🎯 Deploy Steps

### Step 1: Choose Platform
| Platform | Command | Best For |
|----------|---------|----------|
| **Railway** | `./deploy.sh railway` | Full stack + DB |
| **Render** | `./deploy.sh render` | Free tier |
| **Vercel** | `./deploy.sh vercel` | Frontend only |

### Step 2: Configure Environment
```
Railway Dashboard → Your Project → Variables
Add all variables from .env file
```

### Step 3: Get URL
```
Railway provides: https://your-app.up.railway.app
Render provides: https://your-app.onrender.com
```

### Step 4: Update Frontend
```bash
# web/.env.production
VITE_API_URL=https://your-app.up.railway.app
```

### Step 5: Test
```
Open https://your-domain.com
Test signup, login, payments
```

---

## 🆘 Common Commands

```bash
# Check deployment status
railway status

# View logs
railway logs

# Restart
railway restart

# Rollback
railway rollback
```

---

## 📚 Need Help?

- **Full Guide:** `DEPLOYMENT_GUIDE.md`
- **Setup Script:** `./deploy.sh --help`
- **Stripe Setup:** `STRIPE_SETUP.md`

---

## 🎉 You're Ready!

**Run this to deploy:**
```bash
./deploy.sh railway
```

Or manually:
```bash
railway login
railway up
```

**Questions?** Check DEPLOYMENT_GUIDE.md
