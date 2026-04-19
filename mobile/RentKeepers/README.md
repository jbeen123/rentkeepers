# RentKeepers Mobile App 📱

A React Native mobile app for landlords to manage rent on the go.

## Features

- 🔐 **Secure Login** with 2FA support
- 📊 **Dashboard** with rent statistics
- 👥 **Tenant Management** - view, add, track payments
- 💵 **Quick Payments** - log rent payments instantly
- 📊 **Reports** - view income and occupancy trends
- 🔔 **Push Notifications** - rent due reminders (coming soon)

## Tech Stack

- **Framework:** React Native + Expo
- **Navigation:** React Navigation v6
- **State:** React Context + AsyncStorage
- **Auth:** Session-based (with Flask backend)
- **UI:** Native styling (no heavy UI library)

## Quick Start

### Prerequisites

```bash
# Install Expo CLI
npm install -g expo-cli

# Or use npx
npx expo --version
```

### Setup

```bash
cd mobile/RentKeepers

# Install dependencies (already done)
npm install

# Start development server
npm start
# or
expo start
```

### Running on Device

**Option 1: Expo Go App (Easiest)**
1. Install "Expo Go" from App Store / Play Store
2. Scan the QR code from terminal
3. App loads instantly

**Option 2: iOS Simulator (Mac only)**
```bash
npm run ios
```

**Option 3: Android Emulator**
```bash
npm run android
```

## Project Structure

```
mobile/RentKeepers/
├── src/
│   ├── api/
│   │   └── client.js          # API client for Flask backend
│   ├── components/            # Reusable UI components
│   ├── context/
│   │   └── AuthContext.js     # Authentication state
│   ├── screens/
│   │   ├── LoginScreen.js     # Email/password login
│   │   ├── Verify2FAScreen.js # 2FA code entry
│   │   ├── DashboardScreen.js # Main dashboard
│   │   └── TenantsScreen.js   # Tenant list
│   └── utils/                 # Helper functions
├── App.js                     # Root navigation
└── package.json
```

## Connecting to Backend

The app expects the Flask backend at `http://localhost:5000`.

For mobile testing, update `src/api/client.js`:

```javascript
// For physical device on same WiFi
const API_BASE_URL = 'http://192.168.1.xxx:5000';

// For production
const API_BASE_URL = 'https://your-railway-url.up.railway.app';
```

## API Endpoints Needed

The mobile app needs these backend endpoints (not yet in Flask):

```
GET  /api/dashboard      - Dashboard stats
GET  /api/tenants       - List all tenants
POST /api/tenants       - Add new tenant
GET  /api/tenants/:id    - Tenant details
POST /api/payments      - Add payment
GET  /api/properties    - List properties
```

## Current Status

✅ Implemented:
- Login UI with 2FA support
- Dashboard with mock data
- Tenant list with search/filter
- Navigation structure

🚧 TODO:
- Wire up real API endpoints
- Add payment form
- Property management
- Push notifications
- Offline support

## Building for Production

```bash
# Generate iOS/Android native projects
npx expo prebuild

# Build APK (Android)
eas build --platform android

# Build IPA (iOS - requires Apple Dev account)
eas build --platform ios
```

## Screenshots

| Login | Dashboard | Tenants |
|-------|-----------|---------|
| ![Login](screenshots/login.png) | ![Dashboard](screenshots/dashboard.png) | ![Tenants](screenshots/tenants.png) |

---

Built with 🏠 for landlords everywhere.
