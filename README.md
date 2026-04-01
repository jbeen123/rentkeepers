# RentKeepers 🏠

Simple rent tracking for landlords who don't need bloated software.

## Features

- ✅ User authentication (register/login)
- ✅ Add/manage tenants and properties
- ✅ Track monthly rent payments
- ✅ Visual dashboard showing who's paid, pending, or late
- ✅ Email reminders for upcoming/outstanding rent
- ✅ Export to CSV for tax time
- ✅ Clean, simple UI - no unnecessary features

## Quick Start

### 1. Install dependencies

```bash
cd rentkeepers
pip install -r requirements.txt
```

### 2. Configure email (optional - for reminders)

Copy `.env.example` to `.env` and fill in your email settings:

```bash
cp .env.example .env
```

Then edit `.env` with your email credentials.

### 3. Run the app

```bash
python app.py
```

### 4. Open in browser

Go to `http://localhost:5000` and register an account.

## Project Structure

```
rentkeepers/
├── app.py              # Flask application
├── models.py           # Database models (SQLAlchemy)
├── requirements.txt    # Python dependencies
├── .env.example        # Environment variables template
├── templates/          # HTML templates
│   ├── base.html
│   ├── dashboard.html
│   ├── login.html
│   ├── register.html
│   ├── settings.html
│   ├── tenants.html
│   ├── edit_tenant.html
│   └── payments.html
└── rentkeepers.db      # SQLite database (auto-created)
```

## Email Reminders Setup

To send email reminders:

1. Create a Gmail account (or use existing)
2. Enable 2-factor authentication
3. Generate an App Password at https://myaccount.google.com/apppasswords
4. Add to your `.env` file:
   ```
   MAIL_USERNAME=your_email@gmail.com
   MAIL_PASSWORD=your_app_password
   ```
5. Go to Settings in RentKeepers and enable reminders

## Pricing Ideas

- **Free tier:** Up to 3 tenants
- **Paid tier:** $9/month or $79/year for unlimited tenants
- **One-time:** $149 lifetime license

## Next Steps

1. Test locally, add some dummy tenants/payments
2. Deploy to a VPS or Railway/Render
3. Add Stripe for payments
4. Market to landlords on Reddit (r/RealEstate, r/landlords) and Facebook groups
