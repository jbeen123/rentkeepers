# Owner Statements PDF Feature

Professional PDF statement generation for RentKeepers business subscribers (property management companies with 50+ units).

## Features

- 📄 **Professional PDF Reports** — Clean, branded owner statements
- 📊 **Financial Summary Cards** — Income, expenses, management fees, net to owner
- 📋 **Detailed Transaction Tables** — All income and expenses with categories
- 📧 **Auto-Email Delivery** — Scheduled monthly statements sent automatically
- 🌐 **Owner Portal** — Self-service download and viewing
- 📱 **Responsive Design** — Works on desktop and mobile

## Installation

```bash
# Install dependencies
npm install pdfkit node-cron

# Copy files to your project
cp -r rentkeepers/* your-project/
```

## Quick Start

### 1. Generate a Statement

```javascript
const OwnerStatementGenerator = require('./rentkeepers/owner-statements');

const generator = new OwnerStatementGenerator();

const data = {
  company: {
    name: 'Metro Property Management',
    address: '123 Business Plaza',
    city: 'Austin', state: 'TX', zip: '78701',
    phone: '(512) 555-0100',
    email: 'statements@metropm.com'
  },
  owner: {
    name: 'Robert Johnson',
    address: '456 Oakwood Drive',
    city: 'Houston', state: 'TX', zip: '77001',
    email: 'rjohnson@email.com'
  },
  property: {
    id: 'PROP-7829',
    name: 'Lakeside Apartments',
    address: '789 Lakeview Boulevard',
    city: 'Austin', state: 'TX', zip: '78745',
    unitCount: 64
  },
  statementPeriod: { month: 3, year: 2025 },
  transactions: [
    { date: '2025-03-01', description: 'Unit 101 - March Rent', category: 'Rent', type: 'income', amount: 1450.00 },
    { date: '2025-03-02', description: 'Plumbing Repair - Unit 103', category: 'Maintenance', type: 'expense', amount: 245.00 },
    // ... more transactions
  ],
  summary: {
    totalIncome: 14175.00,
    totalExpenses: 4595.00,
    managementFee: 1417.50,
    netToOwner: 8162.50
  }
};

const pdfPath = await generator.generateStatement(data);
console.log('Statement saved to:', pdfPath);
```

### 2. Set Up API Routes

```javascript
const express = require('express');
const statementRoutes = require('./rentkeepers/api-routes');

app.use('/api/statements', statementRoutes);
```

### 3. Start Auto-Scheduler

```javascript
const scheduler = require('./rentkeepers/scheduler');

// Run on the 5th of each month at 2 AM
scheduler.start('0 2 5 * *');
```

### 4. Frontend Component

```jsx
import OwnerStatements from './rentkeepers/frontend/OwnerStatements';

function OwnerDashboard({ ownerId }) {
  return (
    <div>
      <OwnerStatements ownerId={ownerId} />
    </div>
  );
}
```

## Database Schema

Required models:

- `Company` — Property management company info
- `Owner` — Property owner details
- `Property` — Property info, management fee %
- `Transaction` — Income/expense records
- `Statement` — Statement metadata (created automatically)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/statements/generate` | Generate new statement |
| GET | `/api/statements/download/:filename` | Download PDF |
| GET | `/api/statements/owner/:ownerId` | List owner statements |
| POST | `/api/statements/schedule` | Schedule auto-statements |

## Configuration

Add to your `.env`:

```env
# Statement settings
STATEMENT_GENERATION_DAY=5  # Day of month to generate statements
STATEMENT_RETENTION_DAYS=90

# Email settings
SMTP_HOST=smtp.gmail.com
SMTP_USER=notifications@yourcompany.com
SMTP_PASS=your-app-password

# App URL for download links
APP_URL=https://rentkeepers.app
```

## Customization

### Change PDF Styling

Edit `owner-statements.js`:

```javascript
// Update colors
const cards = [
  { label: 'Total Income', value: this.formatCurrency(summary.totalIncome), color: '#22c55e' },
  // ...
];

// Change fonts
doc.fontSize(24).font('Helvetica-Bold').text(company.name, 50, 50);
```

### Add Custom Fields

Extend the data object with custom fields:

```javascript
data.customFields = {
  occupancyRate: '94%',
  averageRent: '$1,450',
  leaseRenewals: 3
};
```

## File Structure

```
rentkeepers/
├── owner-statements.js      # PDF generation engine
├── api-routes.js            # Express API routes
├── scheduler.js             # Cron job for auto-generation
├── models/
│   └── statement.js         # Mongoose schema
├── frontend/
│   └── OwnerStatements.jsx  # React component
└── example-usage.js         # Usage examples
```

## Testing

Run the example:

```bash
node rentkeepers/example-usage.js
```

This generates a sample statement PDF with mock data.

## License

MIT
