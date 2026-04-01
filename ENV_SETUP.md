# RentKeepers Environment Setup

## Quick Start

### 1. Local Development

Copy the development config to `.env`:
```bash
cp .env.development .env
```

Edit `.env` and add your Gmail credentials for email reminders:
```bash
# Required for email reminders
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password_here
```

**Note:** Use an [App Password](https://myaccount.google.com/apppasswords), not your regular Gmail password.

### 2. Production (Vercel)

For Vercel deployment, set environment variables in the dashboard:

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project → **Settings** → **Environment Variables**
3. Add each variable from `.env.production`:
   - `SECRET_KEY` - Generate with: `openssl rand -hex 32`
   - `MAIL_USERNAME` - Your email
   - `MAIL_PASSWORD` - Your app password
   - `MAIL_SERVER`, `MAIL_PORT`, etc. (optional)

### 3. Generate New Secret Key

```bash
# Linux/Mac
openssl rand -hex 32

# Or use Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

## Environment Files

| File | Purpose |
|------|---------|
| `.env` | Active config (gitignored) |
| `.env.example` | Template with empty values |
| `.env.development` | Local dev defaults |
| `.env.production` | Production template |

## ⚠️ Security

- **NEVER commit `.env` to git!**
- `.gitignore` is already configured to block `.env` files
- Keep your `SECRET_KEY` private
- Rotate credentials if accidentally exposed