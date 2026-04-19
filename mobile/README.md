# RentKeepers Mobile App 📱

React Native mobile app for RentKeepers landlords.

## Features

- 🔐 **Secure Login** - Email/password + 2FA support
- 📊 **Dashboard** - Quick stats on rent status
- 👥 **Tenant Management** - View and add tenants
- 💰 **Payment Logging** - Record payments on the go
- 🔔 **Push Notifications** - Rent reminders (coming soon)

## Quick Start

```bash
cd mobile/RentKeepers

# Install dependencies (already done)
npm install

# Start the app
npx expo start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR with Expo Go app on your phone

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
│   │   └── DashboardScreen.js # Main dashboard
│   └── Navigation.js          # Navigation setup
├── App.js                     # Entry point
└── package.json
```

## Backend API Requirements

The mobile app needs these Flask backend endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/login` | POST | Form login, returns session |
| `/verify-2fa` | POST | Verify TOTP code |
| `/logout` | GET | Clear session |
| `/api/tenants` | GET | List tenants |
| `/api/tenants` | POST | Add tenant |
| `/api/payments` | POST | Log payment |
| `/api/dashboard` | GET | Stats for dashboard |

**Note:** The Flask backend currently uses server-side sessions. For mobile, you'll need to either:
1. Enable CORS and use cookie-based sessions
2. Add JWT token support to the backend
3. Use a mobile-compatible auth method

## Current Status

✅ Implemented:
- Login with 2FA flow
- Dashboard UI
- Navigation structure
- Auth context

🚧 Coming Soon:
- Tenant list/add screens
- Payment logging
- Push notifications
- Offline support

## Testing

```bash
# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android

# Run tests
npm test
```
