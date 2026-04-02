# RentKeepers 🏠

Simple rent tracking for landlords who don't need bloated software.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/REPLACEME)

## Features

- ✅ **Free tier** — Up to 3 tenants, no credit card required
- ✅ **Premium** — $9/mo or $79/yr for unlimited tenants
- ✅ **Lifetime** — $149 one-time payment
- ✅ Tenant management & payment tracking
- ✅ Email reminders for upcoming rent
- ✅ CSV export for tax time
- ✅ Clean, simple UI

## Quick Start

### One-Click Deploy (Recommended)

Click the button above to deploy to Railway. You'll get:
- Automatic PostgreSQL database
- SSL certificate
- Custom domain
- Zero config required

### Manual Deploy

```bash
# Clone repo
git clone https://github.com/jbeen123/rentkeepers.git
cd rentkeepers

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with your settings

# Run migrations
python -c "from models import init_db; init_db()"

# Start app
python app.py
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | ✅ | Flask secret key |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `MAIL_USERNAME` | ❌ | Gmail for email reminders |
| `MAIL_PASSWORD` | ❌ | Gmail App Password |
| `STRIPE_SECRET_KEY` | ❌ | For payments |
| `STRIPE_PUBLISHABLE_KEY` | ❌ | For payments |
| `STRIPE_WEBHOOK_SECRET` | ❌ | For Stripe webhooks |
| `STRIPE_PRICE_MONTHLY` | ❌ | Stripe monthly price ID |

## Pricing

| Plan | Price | Tenants | Features |
|------|-------|---------|----------|
| Free | $0 | 3 | Basic tracking, CSV export |
| Monthly | $9/mo | Unlimited | Email reminders, import/export |
| Yearly | $79/yr | Unlimited | Same as monthly, 27% off |
| Lifetime | $149 | Unlimited | One-time payment |

## Screenshots

*Dashboard showing rent status, outstanding amounts, and payment history.*

## Tech Stack

- **Backend:** Flask + SQLAlchemy + PostgreSQL
- **Frontend:** Bootstrap 5 + vanilla JS
- **Payments:** Stripe
- **Email:** Flask-Mail (Gmail SMTP)
- **Deploy:** Docker + Railway

## Contributing

This is a solo project but open to PRs. Main areas:
- Mobile app (React Native?)
- ACH payments integration
- Tenant portal (for renters to pay online)

## License

MIT License - use it, modify it, sell it.

---

**Support:** support@rentkeepers.com

**Roadmap:** [GitHub Issues](https://github.com/jbeen123/rentkeepers/issues)