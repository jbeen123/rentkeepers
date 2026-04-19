# Owner Statements - Complete Integration Guide

This guide walks you through integrating all 4 features into your existing RentKeepers codebase.

## 📁 Files Added

```
rentkeepers/
├── owner_statements.py          # Enhanced PDF + API routes (all features)
├── migrate_statements.py        # Database migration
├── models_extensions.py         # Model definitions (reference)
└── web/src/components/
    └── OwnerStatements.jsx      # Full-featured React component
```

## 🚀 Step-by-Step Integration

### Step 1: Install Dependencies

Add to `requirements.txt`:
```
reportlab==4.4.10
```

Install:
```bash
cd Projects/rentkeepers
source venv/bin/activate
pip install reportlab
```

### Step 2: Run Database Migration

This creates the new tables:
```bash
cd Projects/rentkeepers
source venv/bin/activate
python migrate_statements.py
```

Expected output:
```
✅ Migration complete!
New tables created:
  - expenses (track property expenses)
  - company_settings (company branding & settings)
  - owner_statements (generated statement records)
  - statement_email_logs (email delivery tracking)
```

### Step 3: Update models.py

Add these relationships to your existing models in `models.py`:

**To Property class, add:**
```python
# Add after existing columns
management_fee_percent = Column(Float, default=10.0)

# Add to relationships
expenses = relationship("Expense", back_populates="property_rel")
statements = relationship("OwnerStatementRecord", back_populates="property_rel")
```

**To User class, add:**
```python
# Add to relationships
expenses = relationship("Expense", back_populates="user", cascade="all, delete-orphan")
company_settings = relationship("CompanySettings", back_populates="user", uselist=False)
statements = relationship("OwnerStatementRecord", back_populates="user", cascade="all, delete-orphan")
```

### Step 4: Wire Up Flask Routes

Add to `app.py` near the top with other imports:
```python
from owner_statements import init_owner_statement_routes
```

Add after app initialization (after `mail = Mail(app)`):
```python
# Initialize owner statement routes with email support
init_owner_statement_routes(app, mail)
```

### Step 5: Add React Component

Copy the component:
```bash
cp owner_statements/web/src/components/OwnerStatements.jsx \
   Projects/rentkeepers/web/src/components/
```

Use it in your app:
```jsx
import OwnerStatements from './components/OwnerStatements';

// In your component:
<OwnerStatements propertyId={1} />
```

## 📊 Features Overview

### 1. Expense Tracking
- Track maintenance, insurance, taxes, utilities
- Associate with properties and months
- Appears in statements automatically

**API Endpoints:**
- `GET /api/expenses?property_id=1&month=3&year=2025`
- `POST /api/expenses` - Create expense

### 2. Company Branding
- Custom company name, address, logo
- Custom payment terms
- Custom email templates

**API Endpoints:**
- `GET /api/statements/company-settings`
- `POST /api/statements/company-settings`

### 3. Management Fee Configuration
- Per-property fee percentage
- Default company-wide setting
- Displayed on statement with calculation

**Configuration:**
- Company default: Settings tab → Default Management Fee
- Per-property: Update Property.management_fee_percent

### 4. Email Delivery
- Send statements automatically on generation
- Professional HTML email template
- Attachment with PDF

**Usage:**
- Check "Send via email" when generating
- Or configure auto-send in settings

## 🧪 Test It

### Generate a test statement:
```bash
curl -X POST http://localhost:5000/api/statements/generate \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": 1,
    "month": 3,
    "year": 2025,
    "send_email": false
  }'
```

### Add a test expense:
```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": 1,
    "description": "HVAC Repair",
    "category": "maintenance",
    "amount": 450.00,
    "expense_date": "2025-03-15",
    "for_month": "2025-03"
  }'
```

## 📋 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/statements/generate` | Generate PDF (returns file) |
| GET | `/api/statements/property/{id}` | List periods with data |
| GET | `/api/statements/company-settings` | Get settings |
| POST | `/api/statements/company-settings` | Update settings |
| GET | `/api/expenses` | List expenses |
| POST | `/api/expenses` | Create expense |

## ⚙️ Environment Variables

Add to `.env`:
```
# Email settings (should already exist from your Flask-Mail setup)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# Optional: Statement storage
STATEMENT_STORAGE_PATH=./static/statements
```

## 🎨 UI Tabs

The React component has 3 tabs:

1. **Statements** - Generate and download PDFs
2. **Expenses** - Add/view expenses for the selected month
3. **Company Settings** - Branding, fees, auto-send

## 🔧 Customization

### Change PDF styling:
Edit `owner_statements.py` → `OwnerStatementGenerator._create_custom_styles()`

### Change email template:
Edit `owner_statements.py` → `StatementEmailService.send_statement()`

### Add expense categories:
Edit the `categories` array in `OwnerStatements.jsx`

## 🐛 Troubleshooting

**"Models not found" error:**
- Run `migrate_statements.py` first
- Make sure you're in the virtual environment

**PDF won't generate:**
- Check `reportlab` is installed
- Verify property exists and belongs to user

**Email not sending:**
- Verify Flask-Mail is configured in `app.py`
- Check spam folders
- Look for errors in console

## 📝 Next Steps

1. **Schedule auto-send**: Set up a cron job or use APScheduler
2. **Add logo upload**: Extend company settings with file upload
3. **Bulk generate**: Add API for generating all properties at once
4. **Owner portal**: Create separate login for property owners

## ✅ Verification Checklist

- [ ] `reportlab` installed
- [ ] Database migration run
- [ ] `models.py` updated with relationships
- [ ] `app.py` imports and initializes routes
- [ ] React component copied
- [ ] Test PDF generated successfully
- [ ] Test expense added and appears in PDF
- [ ] Company settings saved and appear on PDF
- [ ] Email sent with attachment
