# Deploy RentKeepers to Render

## 🚀 **Quick Deploy Guide**

### **Option 1: One-Click Deploy (Recommended)**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/yourusername/rentkeepers)

---

### **Option 2: Manual Deploy**

## **Step 1: Prepare Your Repository**

```bash
cd /home/jahffy/.openclaw/workspace/rentkeepers

# Initialize git if not already done
git init
git add .
git commit -m "Ready for Render deployment"

# Push to GitHub/GitLab
git remote add origin https://github.com/yourusername/rentkeepers.git
git push -u origin main
```

---

## **Step 2: Create Render Account**

1. Go to **https://render.com**
2. Sign up (GitHub, GitLab, or email)
3. Free tier includes:
   - 750 hours/month free (enough for 1 web service)
   - Starter plan: $7/month for always-on
   - Free PostgreSQL database (90 days)

---

## **Step 3: Create Web Service**

### **From Render Dashboard:**

1. Click **"New +"** → **"Web Service"**
2. Connect your repository:
   - **GitHub/GitLab**: Select `rentkeepers` repo
   - **Deploy from Git URL**: Paste repo URL
3. Configure:
   ```
   Name: rentkeepers
   Region: Oregon (closest to you)
   Branch: main
   Root Directory: (leave blank)
   Runtime: Node
   Build Command: npm install
   Start Command: node main-server.js
   ```
4. Choose Plan:
   - **Free**: Sleeps after 15 min inactivity
   - **Starter** ($7/mo): Always on
5. Click **"Advanced"** and add environment variables

---

## **Step 4: Add Environment Variables**

In Render dashboard → Environment tab, add:

### **Required:**
```bash
NODE_ENV=production
PORT=3000
STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for testing)
```

### **Optional (Email):**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=RentKeepers
ADMIN_EMAIL=admin@yourdomain.com
```

### **Optional (Late Fees):**
```bash
LATE_FEE_ENABLED=true
LATE_FEE_SCHEDULE=0 3 * * *
DEFAULT_GRACE_PERIOD_DAYS=5
DEFAULT_LATE_FEE_TYPE=percentage
DEFAULT_LATE_FEE_PERCENTAGE=5
```

---

## **Step 5: Deploy**

1. Click **"Create Web Service"**
2. Wait for build (2-5 minutes)
3. Once deployed, you'll get a URL:
   ```
   https://rentkeepers-xxxx.onrender.com
   ```

---

## **Step 6: Test Deployment**

### **Health Check:**
```bash
curl https://rentkeepers-xxxx.onrender.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "RentKeepers Complete Server",
  "features": {
    "stripe": "✅ Enabled",
    "documents": "✅ Enabled",
    "calendar": "✅ Enabled"
  }
}
```

### **Test Stripe:**
```bash
curl https://rentkeepers-xxxx.onrender.com/api/stripe/health
```

### **Test Documents:**
```bash
curl https://rentkeepers-xxxx.onrender.com/api/documents
```

---

## **Step 7: Add Custom Domain (Optional)**

1. In Render dashboard → Settings
2. Click **"Add Custom Domain"**
3. Enter your domain: `rentkeepers.yourdomain.com`
4. Update DNS records as instructed
5. SSL is automatic (Let's Encrypt)

---

## **Step 8: Setup Background Worker (Optional)**

For scheduled tasks (late fees, statements):

1. **New +** → **"Background Worker"**
2. Connect same repository
3. Configure:
   ```
   Name: rentkeepers-worker
   Build Command: npm install
   Start Command: node start-late-fee-service.js
   ```
4. Add same environment variables
5. Deploy

---

## **Step 9: Setup Database (Optional)**

For full tenant/property management:

1. **New +** → **"PostgreSQL"**
2. Configure:
   ```
   Name: rentkeepers-db
   Database: rentkeepers
   Plan: Starter (free for 90 days)
   ```
3. Add connection string to web service env vars:
   ```bash
   DATABASE_URL=postgresql://...
   ```

---

## **📊 Cost Estimate**

| Service | Plan | Cost/Month |
|---------|------|------------|
| Web Service | Free | $0 (sleeps) |
| Web Service | Starter | $7 |
| Worker | Free | $0 |
| Database | Starter | $0 (90 days), then $7 |
| **Total** | **Minimal** | **$0-14/mo** |

---

## **🔧 Troubleshooting**

### **Build Fails**
```bash
# Check logs in Render dashboard
# Common issues:
# - Missing package.json
# - Node version mismatch (add to package.json)
# - Build errors (check npm install output)
```

### **Service Won't Start**
```bash
# Check logs: render logs -f rentkeepers
# Test locally first:
node main-server.js
```

### **Environment Variables Not Working**
- Verify in Render dashboard → Environment
- Redeploy after adding variables
- Check for typos

### **Stripe Not Working**
- Verify key starts with `sk_test_` or `sk_live_`
- Check webhook secret if using webhooks
- Test mode vs live mode

---

## **🔄 Auto-Deploy**

Render automatically deploys when you push to main:

```bash
git push origin main
# → Render detects change
# → Auto-builds and deploys
# → Zero downtime
```

---

## **📱 Update Mobile App URL**

After deployment, update mobile app config:

```javascript
// src/config.js
export const API_CONFIG = {
  PRODUCTION: 'https://rentkeepers-xxxx.onrender.com',
};
```

---

## **🔐 Security Checklist**

- [ ] Use `sk_live_` keys in production (not test keys)
- [ ] Enable HTTPS (automatic on Render)
- [ ] Set strong SMTP password
- [ ] Restrict database IP access
- [ ] Enable 2FA on Render account
- [ ] Regular backups (Render handles this)

---

## **📈 Monitoring**

### **Render Dashboard:**
- Real-time logs
- CPU/Memory usage
- Request metrics
- Error tracking

### **Health Checks:**
```bash
# Add to monitoring service (UptimeRobot, Pingdom)
https://rentkeepers-xxxx.onrender.com/api/health
```

---

## **🎯 Next Steps**

1. ✅ Deploy to Render
2. ✅ Test all endpoints
3. ✅ Add custom domain
4. ✅ Update mobile app URL
5. ✅ Configure Stripe webhooks
6. ✅ Setup email notifications
7. ✅ Add database for full features

---

## **📞 Support**

- **Render Docs:** https://render.com/docs
- **Render Status:** https://status.render.com
- **Community:** https://discord.gg/render

---

**Deploy Time:** ~10 minutes  
**Cost:** $0-7/month  
**Difficulty:** ⭐⭐☆☆☆ (Easy)

**Ready to deploy! 🚀**
