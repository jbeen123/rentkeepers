# Mobile App - Backend Connection Guide

## ✅ **Connection Status: WORKING**

**Last Tested:** April 30, 2026  
**Backend:** http://localhost:3000  
**Status:** ✅ All endpoints responding

---

## 🔧 **Configuration Updated**

### **API Client** (`src/api/client.js`)
- ✅ Updated to use port 3000 (was 5000)
- ✅ Now imports from config.js

### **Config File** (`src/config.js`)
- ✅ Created with environment detection
- ✅ Supports Android emulator (10.0.2.2)
- ✅ Supports iOS simulator (localhost)
- ✅ Production-ready configuration

---

## 🚀 **Quick Start**

### **1. Start Backend Server**

```bash
cd /home/jahffy/.openclaw/workspace/rentkeepers
node main-server.js
```

Server will start on: **http://localhost:3000**

### **2. Test Connection**

```bash
cd /home/jahffy/.openclaw/workspace/Projects/rentkeepers/mobile
node test-connection.js
```

Expected output:
```
✅ Backend Health → OK
✅ Stripe Status → OK
✅ Documents API → OK
✅ Properties → OK
✅ ICS Calendar → OK
```

### **3. Start Mobile App**

```bash
cd /home/jahffy/.openclaw/workspace/Projects/rentkeepers/mobile/RentKeepers

# Install dependencies (if needed)
npm install

# Start Expo
npx expo start
```

---

## 📱 **Platform-Specific URLs**

### **iOS Simulator**
```
http://localhost:3000
```

### **Android Emulator**
```
http://10.0.2.2:3000
```
(Android emulator uses 10.0.2.2 to reach host machine's localhost)

### **Physical Device (Same WiFi)**
```
http://YOUR_MACHINE_IP:3000
```

To find your machine's IP:
```bash
# Linux
ip addr show | grep "inet "

# macOS
ipconfig getifaddr en0

# Windows
ipconfig
```

Example: `http://192.168.1.100:3000`

---

## 🔐 **Firewall Setup**

If connecting from a physical device, allow port 3000:

```bash
# Linux (ufw)
sudo ufw allow 3000/tcp

# macOS
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node

# Windows (PowerShell)
New-NetFirewallRule -DisplayName "RentKeepers" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

---

## 📋 **Available API Endpoints**

### **Health & Status**
```
GET /api/health              - Server health check
GET /api/properties          - List properties
GET /api/owners              - List owners
```

### **Documents**
```
POST /api/documents/upload        - Upload document
GET  /api/documents               - List documents
GET  /api/documents/:id           - Get document info
GET  /api/documents/download/:id  - Download file
GET  /api/documents/view/:id      - View file
```

### **Calendar (ICS)**
```
GET  /api/ics/sample              - Sample calendar
POST /api/ics/rent-reminder       - Rent reminder
POST /api/ics/maintenance         - Maintenance event
POST /api/ics/showing             - Property showing
```

### **Stripe Payments**
```
GET  /api/stripe/health           - Check connection
GET  /api/stripe/test-mode        - Test vs live mode
POST /api/stripe/customer         - Create customer
POST /api/stripe/payment          - Process payment
POST /api/stripe/invoice          - Create invoice
GET  /api/stripe/subscriptions/:id - List subscriptions
```

### **Owner Statements**
```
POST /api/statements/generate     - Generate statement
GET  /api/statements/download/:id - Download PDF
```

---

## 🧪 **Testing**

### **Test All Endpoints**
```bash
node test-connection.js
```

### **Test Individual Endpoint**
```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/stripe/health
curl http://localhost:3000/api/properties
```

### **Test from Mobile App**
```javascript
import api from './src/api/client';

// Test health
const health = await api.request('/api/health');
console.log(health);

// Test properties
const properties = await api.request('/api/properties');
console.log(properties);
```

---

## 🐛 **Troubleshooting**

### **"Connection refused"**
1. Check if backend is running: `curl http://localhost:3000/api/health`
2. Start backend: `node main-server.js`

### **"Network request failed" (Mobile)**
1. Use correct URL for your platform (see above)
2. Check firewall settings
3. Ensure device and computer are on same WiFi

### **"CORS error"**
The backend should allow CORS. If you see CORS errors, add this to main-server.js:
```javascript
const cors = require('cors');
app.use(cors());
```

### **Stripe not working**
1. Check Stripe key in .env: `STRIPE_SECRET_KEY=sk_test_...`
2. Test: `curl http://localhost:3000/api/stripe/test-mode`

---

## 📊 **Connection Test Results**

```
✅ Backend Health      → OK
✅ Stripe Status       → OK  
✅ Documents API       → OK
✅ Properties          → OK
✅ ICS Calendar        → OK
```

**All systems operational!** 🎉

---

## 🔄 **Updating API URL**

To change the backend URL:

### **Option 1: Update config.js**
```javascript
export const API_CONFIG = {
  LOCAL_HOST: 'http://192.168.1.100:3000',
  // ...
};
```

### **Option 2: Environment Variable**
```bash
export API_URL=http://192.168.1.100:3000
node test-connection.js
```

---

## 📞 **Support**

- Backend Docs: `/home/jahffy/.openclaw/workspace/rentkeepers/README.md`
- API Docs: http://localhost:3000/api/health
- Mobile App: `/home/jahffy/.openclaw/workspace/Projects/rentkeepers/mobile/README.md`

---

**Last Updated:** April 30, 2026  
**Status:** ✅ **CONNECTED & WORKING**
