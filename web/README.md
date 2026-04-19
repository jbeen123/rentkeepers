# RentKeepers Web Frontend

React-based web frontend for the RentKeepers property management application.

## Features

- ⚛️ **React 18** with Vite
- 🎨 **Tailwind CSS** for styling
- 🔐 **Authentication** with JWT
- 📱 **Responsive** design
- 🔄 **React Query** for data fetching
- 🗺️ **React Router** for navigation

## Pages

- **Dashboard** - Overview with stats and rent status
- **Tenants** - Manage tenants (CRUD)
- **Properties** - Manage properties (CRUD)
- **Payments** - Log and view payments
- **Settings** - Profile, password, 2FA
- **Pricing** - Subscription plans

## Quick Start

```bash
# Install dependencies
npm install

# Create env file
cp .env.example .env.local
# Edit .env.local with your backend URL

# Start dev server
npm run dev
```

The dev server will run on `http://localhost:5173`

## Building for Production

```bash
npm run build
```

This creates a `dist/` folder with static files ready for deployment.

## Connecting to Backend

Make sure your Flask backend is running and update the `VITE_API_URL` in your `.env.local`:

```
VITE_API_URL=http://localhost:5000
```

The Flask backend needs to support CORS for the React frontend to communicate with it.

## Project Structure

```
src/
  api/           - API client
  components/    - Shared components
  contexts/      - React contexts (Auth)
  pages/         - Page components
  App.jsx        - Main app with routes
  index.css      - Tailwind + custom styles
```

## Running with Flask

To run both together:

```bash
# Terminal 1: Flask backend
cd ..
python app.py

# Terminal 2: React frontend
cd web
npm run dev
```

Then open `http://localhost:5173` in your browser.