# Fix NetworkError / CORS Error

## 🔍 Root Cause

Your browser is blocking the HTTPS connection to `https://127.0.0.1:5000` because Flask is using a **self-signed SSL certificate**.

This appears as "NetworkError when attempting to fetch resource" in the browser console.

---

## ✅ Solutions (Pick One)

### Option 1: Accept Self-Signed Certificate (Quick Fix)

**Step 1:** Open this URL directly in your browser:
```
https://127.0.0.1:5000
```

**Step 2:** You will see a security warning. Click:
- **Chrome:** `Advanced` → `Proceed to localhost (unsafe)`
- **Firefox:** `Advanced` → `Accept the Risk and Continue`
- **Safari:** `Show Details` → `visit this website`

**Step 3:** Now go back to your React app:
```
http://localhost:5173
```

✅ **The error should be fixed!**

---

### Option 2: Use HTTP Instead of HTTPS (Recommended for Dev)

**Step 1:** Edit `app.py`
```bash
nano app.py
```

**Step 2:** Find line 29 and change:
```python
# OLD (line 29):
app.config['SESSION_COOKIE_SECURE'] = True

# NEW:
app.config['SESSION_COOKIE_SECURE'] = False  # HTTP for development
```

**Step 3:** Restart Flask:
```bash
pkill -f "python app.py"
python app.py
```

**Step 4:** Update frontend to use HTTP:
```bash
# web/.env.local
VITE_API_URL=http://127.0.0.1:5000  # HTTP not HTTPS
```

**Step 5:** Restart React:
```bash
cd web
npm run dev
```

✅ **No more SSL errors!**

---

### Option 3: Use Environment Variable (Best Practice)

**Step 1:** Create a dev environment file:
```bash
echo "FLASK_ENV=development
FLASK_DEBUG=true
USE_HTTPS=false" > .env.development
```

**Step 2:** Modify `app.py` to check environment:
```python
# Add at line 29
import os
use_https = os.getenv('USE_HTTPS', 'true').lower() == 'true'
app.config['SESSION_COOKIE_SECURE'] = use_https
```

**Step 3:** Run Flask with dev config:
```bash
export FLASK_ENV=development
python app.py
```

---

## 🎯 Permanent Fix

I've updated the app to automatically use HTTP in development. The next time you pull the code, it will:

1. Detect development mode
2. Use HTTP instead of HTTPS
3. Eliminate the certificate error

---

## 🚨 Why This Happened

The error returned because:
1. **New payment routes** were added
2. Browser cache was cleared
3. Certificate acceptance expired
4. Or you're using a different browser/incognito

The fix is the same: either accept the certificate or use HTTP.

---

## ✅ Verification

After fix, check:
```javascript
// In browser console
fetch('http://127.0.0.1:5000/api/dashboard')
  .then(r => console.log('✅ Working!'))
  .catch(e => console.log('❌ Still error:', e))
```

---

## 💡 Production Note

In **production**, use real HTTPS with valid SSL certificates (Railway/Render provide these automatically).

The self-signed certificate error only happens in **local development**.
