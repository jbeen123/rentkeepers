# 🚀 Render Deployment Checklist

## ✅ **Pre-Deployment Checklist**

### **Files Created:**
- [x] `render.yaml` - Render configuration
- [x] `DEPLOY-RENDER.md` - Complete deployment guide
- [x] `.renderignore` - Files to exclude
- [x] `deploy-to-render.sh` - Deployment script
- [x] `package.json` - Updated with start script & engines

---

## 📋 **Deployment Steps**

### **1. Prepare Repository** ⏱️ 2 min
```bash
cd /home/jahffy/.openclaw/workspace/rentkeepers

# Run deployment prep script
./deploy-to-render.sh

# Or manually:
git init
git add .
git commit -m "Ready for Render"
git remote add origin https://github.com/yourusername/rentkeepers.git
git push -u origin main
```

### **2. Create Render Account** ⏱️ 2 min
- [ ] Go to https://render.com
- [ ] Sign up (GitHub/GitLab/Email)
- [ ] Free tier: 750 hours/month

### **3. Create Web Service** ⏱️ 3 min
- [ ] Click "New +" → "Web Service"
- [ ] Connect repository
- [ ] Configure:
  - **Name:** rentkeepers
  - **Region:** Oregon (or closest)
  - **Build Command:** `npm install`
  - **Start Command:** `node main-server.js`
  - **Plan:** Free (sleeps) or Starter ($7/mo always-on)

### **4. Add Environment Variables** ⏱️ 3 min
**Required:**
- [ ] `NODE_ENV=production`
- [ ] `STRIPE_SECRET_KEY=sk_test_...` or `sk_live_...`

**Optional (Email):**
- [ ] `SMTP_HOST=smtp.gmail.com`
- [ ] `SMTP_PORT=587`
- [ ] `SMTP_USER=your-email@gmail.com`
- [ ] `SMTP_PASS=your-app-password`
- [ ] `ADMIN_EMAIL=admin@yourdomain.com`

**Optional (Late Fees):**
- [ ] `LATE_FEE_ENABLED=true`
- [ ] `DEFAULT_GRACE_PERIOD_DAYS=5`

### **5. Deploy** ⏱️ 5 min
- [ ] Click "Create Web Service"
- [ ] Wait for build (2-5 minutes)
- [ ] Copy your URL: `https://rentkeepers-xxxx.onrender.com`

### **6. Test Deployment** ⏱️ 2 min
```bash
# Health check
curl https://rentkeepers-xxxx.onrender.com/api/health

# Expected: {"status": "ok", "service": "RentKeepers..."}
```

### **7. Update Mobile App** ⏱️ 1 min
Edit: `/home/jahffy/.openclaw/workspace/Projects/rentkeepers/mobile/RentKeepers/src/config.js`
```javascript
export const API_CONFIG = {
  PRODUCTION: 'https://rentkeepers-xxxx.onrender.com',
};
```

---

## 🎯 **Quick Deploy (One Command)**

```bash
cd /home/jahffy/.openclaw/workspace/rentkeepers
./deploy-to-render.sh
```

Then follow the prompts!

---

## 💰 **Cost Estimate**

| Service | Plan | Cost |
|---------|------|------|
| Web Service | Free | $0 (sleeps after 15min) |
| Web Service | Starter | $7/mo (always-on) |
| Database | Free tier | $0 (90 days) |
| **Total** | **Minimal** | **$0-7/mo** |

---

## 🔧 **Post-Deployment**

### **Test All Features:**
```bash
BASE_URL=https://your-app.onrender.com

# Health
curl $BASE_URL/api/health

# Stripe
curl $BASE_URL/api/stripe/health

# Documents
curl $BASE_URL/api/documents

# Properties
curl $BASE_URL/api/properties

# ICS Calendar
curl $BASE_URL/api/ics/sample
```

### **Setup Custom Domain (Optional):**
- [ ] In Render dashboard → Settings
- [ ] Add custom domain
- [ ] Update DNS records
- [ ] SSL is automatic

### **Setup Monitoring:**
- [ ] Add to UptimeRobot: `https://your-app.onrender.com/api/health`
- [ ] Enable Render email notifications

---

## 🐛 **Common Issues**

| Issue | Solution |
|-------|----------|
| Build fails | Check logs, verify package.json |
| Service won't start | Check start command, test locally first |
| Port conflict | Use PORT env variable (Render sets automatically) |
| Stripe errors | Verify API key in environment variables |
| CORS errors | Add CORS middleware to main-server.js |

---

## 📞 **Support Resources**

- **Render Docs:** https://render.com/docs
- **Status Page:** https://status.render.com
- **Community Discord:** https://discord.gg/render
- **Our Guide:** `DEPLOY-RENDER.md`

---

## ✅ **Deployment Complete!**

After deployment:
1. ✅ Test all endpoints
2. ✅ Update mobile app URL
3. ✅ Configure Stripe webhooks (if needed)
4. ✅ Add custom domain (optional)
5. ✅ Setup monitoring

---

**Estimated Time:** 10-15 minutes  
**Difficulty:** ⭐⭐☆☆☆ (Easy)  
**Cost:** $0-7/month

**Ready to deploy! 🚀**
