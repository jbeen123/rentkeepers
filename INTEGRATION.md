# Owner Statements Integration Guide

## Step 1: Install Dependencies

Add `reportlab` to your requirements.txt:

```bash
# In requirements.txt, add:
reportlab==4.0.9
```

Then install:
```bash
pip install reportlab
```

## Step 2: Add to app.py

Add this import and initialization to your `app.py`:

```python
# Add near top with other imports
from owner_statements import init_owner_statement_routes

# ... after app initialization ...
# Initialize owner statement routes
init_owner_statement_routes(app)
```

## Step 3: Copy owner_statements.py

Copy `owner_statements.py` to your RentKeepers root directory (same level as `app.py`).

## Step 4: Frontend Component

Add the React component from `web/src/components/OwnerStatements.jsx` (see next file).

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/statements/generate` | Generate PDF |
| GET | `/api/statements/property/<id>` | List available periods |

### Generate Statement

**Request:**
```json
POST /api/statements/generate
{
  "property_id": 1,
  "month": 3,
  "year": 2025
}
```

**Response:** PDF file download

### List Statement Periods

**Response:**
```json
{
  "statements": [
    {
      "month": 3,
      "year": 2025,
      "period": "March 2025"
    }
  ]
}
```

## Next Steps

1. **Add Expense Tracking**: The current implementation only tracks income from payments. Add an `Expense` model for full expense tracking.

2. **Company Branding**: Update the `company` dict in `build_statement_data()` with your actual company info.

3. **Management Fee Configuration**: Make the management fee percentage configurable per property.

4. **Email Delivery**: Add automatic email sending of statements.

5. **Owner Portal**: Create a separate login/portal for property owners to view their statements.
