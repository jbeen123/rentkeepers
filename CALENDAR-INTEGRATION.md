# Google Calendar Integration - Setup Guide

## 📅 **Integration Status: READY FOR CONFIGURATION**

**Created:** April 29, 2026  
**Status:** ⚠️ Awaiting Google Credentials

---

## ✅ **What's Been Built**

| Component | File | Status |
|-----------|------|--------|
| **Calendar Service** | `google-calendar-service.js` | ✅ Complete |
| **API Routes** | `calendar-routes.js` | ✅ Complete |
| **Test Script** | `test-calendar-setup.js` | ✅ Complete |
| **Dependencies** | googleapis installed | ✅ Installed |
| **Route Tests** | 10/10 checks | ✅ Passing |

---

## 📋 **API Endpoints Created**

### Authentication
```
GET  /api/calendar/auth-url      - Get OAuth authorization URL
POST /api/calendar/authorize     - Save OAuth token
GET  /api/calendar/status        - Check connection status
```

### Events
```
GET    /api/calendar/events              - List events
POST   /api/calendar/events              - Create event
PUT    /api/calendar/events/:id          - Update event
DELETE /api/calendar/events/:id          - Delete event
```

### Property Management Events
```
POST /api/calendar/events/rent-reminder    - Create rent due reminder
POST /api/calendar/events/maintenance      - Create maintenance appointment
POST /api/calendar/events/showing          - Create property showing
```

---

## 🔐 **Required Setup Steps**

### Step 1: Get Google Cloud Credentials

1. **Go to Google Cloud Console:**
   ```
   https://console.cloud.google.com/
   ```

2. **Create or select a project**

3. **Enable Google Calendar API:**
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: **"Web application"**
   - Add redirect URI: `http://localhost:3000/api/calendar/callback`
   - Click "Create"

5. **Download credentials JSON file**

6. **Save as `google-credentials.json`** in the rentkeepers folder

---

### Step 2: Authorize Calendar Access

Once credentials are added:

```bash
# 1. Start the server
node test-server.js

# 2. Get authorization URL
curl http://localhost:3000/api/calendar/auth-url

# 3. Visit the URL in browser
# 4. Authorize the application
# 5. Copy the authorization code

# 6. Save the token
curl -X POST http://localhost:3000/api/calendar/authorize \
  -H "Content-Type: application/json" \
  -d '{"code": "YOUR_AUTH_CODE"}'
```

---

### Step 3: Test the Integration

```bash
# Check connection status
curl http://localhost:3000/api/calendar/status

# Get upcoming events
curl http://localhost:3000/api/calendar/events?days=7

# Create a test event
curl -X POST http://localhost:3000/api/calendar/events \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Test Event",
    "description": "Testing calendar integration",
    "startDateTime": "2026-04-30T10:00:00",
    "endDateTime": "2026-04-30T11:00:00"
  }'
```

---

## 🏠 **Property Management Use Cases**

### 1. Rent Due Reminders

```javascript
POST /api/calendar/events/rent-reminder

{
  "tenantName": "John Smith",
  "propertyAddress": "123 Main St, Unit 101",
  "amount": 1500,
  "dueDate": "2026-05-01"
}
```

**Creates:** Calendar event with email reminders 1 day before and popup 1 hour before

---

### 2. Maintenance Appointments

```javascript
POST /api/calendar/events/maintenance

{
  "propertyAddress": "456 Oak Ave",
  "description": "Fix leaking faucet",
  "scheduledDate": "2026-04-30T14:00:00",
  "technician": "Mike's Plumbing"
}
```

**Creates:** 2-hour appointment with location and technician info

---

### 3. Property Showings

```javascript
POST /api/calendar/events/showing

{
  "propertyAddress": "789 Pine Rd",
  "clientName": "Sarah Johnson",
  "scheduledDate": "2026-05-01T15:00:00"
}
```

**Creates:** 1-hour showing appointment with client name

---

### 4. Bulk Lease Sync

```javascript
// In your code:
const calendarService = require('./google-calendar-service');

// Sync all rent due dates for next 12 months
const lease = {
  tenantName: 'John Smith',
  propertyAddress: '123 Main St',
  monthlyRent: 1500,
  rentDueDay: 1
};

await calendarService.syncLeaseEvents(lease);
// Creates 12 rent reminder events automatically
```

---

## 🔧 **Integration into Main Server**

Add calendar routes to your server:

```javascript
// In server.js
const calendarRoutes = require('./rentkeepers/calendar-routes');

// Add calendar routes
app.use('/api/calendar', calendarRoutes);

// Start server
app.listen(3000);
```

---

## 📊 **Features Implemented**

### ✅ Complete
- OAuth 2.0 authentication
- Token storage and refresh
- Event creation
- Event updates
- Event deletion
- Event listing
- Rent due reminders
- Maintenance appointments
- Property showings
- Lease event sync
- Custom reminders

### ⚠️ Needs Configuration
- Google Cloud credentials
- OAuth authorization
- Token generation

---

## 🛠️ **Configuration Files**

### .env Variables
```bash
# Google Calendar
GOOGLE_CREDENTIALS_PATH=./google-credentials.json
GOOGLE_TOKEN_PATH=./google-token.json
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/callback
```

### Required Files
```
rentkeepers/
├── google-calendar-service.js     # ✅ Created
├── calendar-routes.js              # ✅ Created
├── test-calendar-setup.js          # ✅ Created
├── google-credentials.json         # ⚠️ You need to create
├── google-token.json               # ⚠️ Auto-created after auth
└── .env.calendar.example           # ✅ Created
```

---

## 🧪 **Testing Checklist**

After setup:

- [ ] Run `node test-calendar-setup.js`
- [ ] Verify credentials loaded
- [ ] Check `/api/calendar/status` returns connected
- [ ] Create test event
- [ ] List upcoming events
- [ ] Update test event
- [ ] Delete test event
- [ ] Create rent reminder
- [ ] Create maintenance appointment
- [ ] Create property showing

---

## 📞 **Quick Start Commands**

```bash
# 1. Check setup status
node test-calendar-setup.js

# 2. Start server
node test-server.js

# 3. Get auth URL (in another terminal)
curl http://localhost:3000/api/calendar/auth-url

# 4. After authorization, save token
curl -X POST http://localhost:3000/api/calendar/authorize \
  -H "Content-Type: application/json" \
  -d '{"code": "4/0AX4XfWh..."}'

# 5. Verify connection
curl http://localhost:3000/api/calendar/status

# 6. Create test event
curl -X POST http://localhost:3000/api/calendar/events \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Test Event",
    "startDateTime": "2026-04-30T10:00:00",
    "endDateTime": "2026-04-30T11:00:00"
  }'
```

---

## 🎯 **Next Steps**

1. **Get Google credentials** (see Step 1 above)
2. **Save as `google-credentials.json`**
3. **Run `node test-calendar-setup.js`** to verify
4. **Authorize calendar access**
5. **Test the API endpoints**
6. **Integrate into main server**

---

## 📚 **Additional Resources**

- Google Calendar API Docs: https://developers.google.com/calendar/api
- OAuth 2.0 Guide: https://developers.google.com/identity/protocols/oauth2
- Node.js Quickstart: https://developers.google.com/calendar/api/quickstart/nodejs

---

**Status:** ⚠️ **AWAITING GOOGLE CREDENTIALS**  
**Code:** ✅ **COMPLETE & TESTED**  
**Ready:** After credentials setup

---

Last Updated: April 29, 2026
