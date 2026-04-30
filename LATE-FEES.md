# Late Fee Auto-Application System

Automated late fee processing for overdue rent payments in RentKeepers.

## 🚀 Features

- **Automatic Detection** - Daily checks for overdue rent payments
- **Flexible Fee Types** - Percentage, flat, or daily late fees
- **Grace Period Support** - Configurable grace period per property
- **Auto-Application** - Automatically creates transaction records
- **Email Notifications** - Sends notices to tenants when fees are applied
- **Admin Summaries** - Daily reports of all late fees applied
- **Duplicate Prevention** - Won't apply multiple fees for same period

## 📋 How It Works

1. **Daily Check** (3:00 AM EST) - Scheduler scans all active leases
2. **Grace Period Check** - Skips units still within grace period
3. **Payment Verification** - Confirms no rent payment received
4. **Fee Calculation** - Applies configured late fee formula
5. **Transaction Created** - Adds late fee to tenant account
6. **Email Sent** - Notifies tenant and admin

## ⚙️ Configuration

### Environment Variables (.env)

```bash
# Enable/disable late fees
LATE_FEE_ENABLED=true

# Cron schedule (default: daily at 3 AM)
LATE_FEE_SCHEDULE=0 3 * * *

# Default grace period (days)
DEFAULT_GRACE_PERIOD_DAYS=5

# Default late fee type: percentage, flat, or daily
DEFAULT_LATE_FEE_TYPE=percentage

# Fee amounts (adjust based on type)
DEFAULT_LATE_FEE_PERCENTAGE=5
DEFAULT_LATE_FEE_FLAT_AMOUNT=50
DEFAULT_LATE_FEE_DAILY_AMOUNT=10

# Admin email for daily summaries
ADMIN_EMAIL=admin@yourcompany.com
```

### Property-Level Settings

Override defaults per property:

```javascript
const property = {
  gracePeriodDays: 7,
  lateFeeType: 'percentage',
  lateFeePercentage: 10,
  // OR
  lateFeeType: 'flat',
  lateFeeFlatAmount: 75,
  // OR
  lateFeeType: 'daily',
  lateFeeDailyAmount: 15
};
```

## 🧪 Testing

### 1. Test Logic (No Database Required)

```bash
cd /home/jahffy/.openclaw/workspace/rentkeepers
node test-late-fee-logic.js
```

**Expected Output:**
```
✅ Percentage-based (5%): $75.00
✅ Flat fee ($50): $50.00
✅ Daily fee ($10/day × 3 days): $30.00
✅ Default (5% or $50 min): $50.00
✅ Default high rent (5%): $100.00
```

### 2. Integration Test (With Database)

```bash
# Set up test data first, then run:
node test-late-fee-integration.js
```

### 3. Manual Trigger

```bash
# Start the service (runs in background)
node start-late-fee-service.js

# Or trigger manually in your code:
const lateFeeScheduler = require('./late-fee-scheduler');
await lateFeeScheduler.processLateFees();
```

## 📊 Late Fee Types

### Percentage-Based
```javascript
lateFeeType: 'percentage'
lateFeePercentage: 5  // 5% of monthly rent
```
- **Example:** $1,500 rent × 5% = **$75 late fee**

### Flat Fee
```javascript
lateFeeType: 'flat'
lateFeeFlatAmount: 50  // Fixed amount
```
- **Example:** Any rent amount = **$50 late fee**

### Daily Fee
```javascript
lateFeeType: 'daily'
lateFeeDailyAmount: 10  // Per day after grace period
```
- **Example:** 5 days late × $10 = **$50 late fee**

## 📧 Email Notifications

### Tenant Notice
Sent automatically when late fee is applied:
- Original due date
- Grace period end date
- Late fee amount
- Payment instructions

### Admin Summary
Sent daily if any late fees were applied:
- Total count of fees
- Total amount collected
- Breakdown by property/unit/tenant

## 🔧 Integration

### Add to Your Main App

```javascript
// In your main server file (e.g., app.js or server.js)
const lateFeeScheduler = require('./rentkeepers/late-fee-scheduler');

// Start the scheduler
lateFeeScheduler.start();

// Or with custom schedule
lateFeeScheduler.start('0 2 * * *'); // 2 AM daily
```

### Combined with Statement Scheduler

```javascript
const statementScheduler = require('./rentkeepers/scheduler');
const lateFeeScheduler = require('./rentkeepers/late-fee-scheduler');

// Start both schedulers
statementScheduler.start('0 2 5 * *'); // 5th of month at 2 AM
lateFeeScheduler.start('0 3 * * *');   // Daily at 3 AM
```

## 📁 File Structure

```
rentkeepers/
├── late-fee-scheduler.js          # Main late fee logic
├── start-late-fee-service.js      # Service starter
├── test-late-fee-logic.js         # Logic tests (no DB)
├── test-late-fee-integration.js   # Full integration tests
├── LATE-FEES.md                   # This documentation
└── .env                           # Configuration
```

## 🛠️ Database Requirements

### Required Models

```javascript
// Property
{
  _id: ObjectId,
  name: String,
  gracePeriodDays: Number,
  lateFeeType: String,
  lateFeePercentage: Number,
  lateFeeFlatAmount: Number,
  lateFeeDailyAmount: Number
}

// Lease
{
  _id: ObjectId,
  unitId: ObjectId,
  tenantName: String,
  tenantEmail: String,
  monthlyRent: Number,
  rentDueDay: Number,
  status: String,
  startDate: Date,
  endDate: Date
}

// Payment
{
  _id: ObjectId,
  leaseId: ObjectId,
  type: String, // 'rent'
  amount: Number,
  paymentDate: Date,
  status: String // 'completed'
}

// Transaction (created by late fee system)
{
  _id: ObjectId,
  propertyId: ObjectId,
  unitId: ObjectId,
  leaseId: ObjectId,
  type: 'income',
  category: 'Late Fee',
  description: String,
  amount: Number,
  date: Date,
  status: 'completed',
  metadata: {
    autoApplied: Boolean,
    originalDueDate: Date,
    gracePeriodDays: Number,
    rentAmount: Number
  }
}
```

## ⚠️ Important Notes

1. **Timezone** - All schedules use America/New_York timezone
2. **Idempotency** - System won't apply duplicate fees for same period
3. **Grace Period** - Counts from rent due date, not lease start
4. **Email Required** - Tenant email needed for notifications (optional)
5. **Admin Email** - Set ADMIN_EMAIL to receive daily summaries

## 🔍 Troubleshooting

### Late fees not applying?

1. Check `LATE_FEE_ENABLED=true` in .env
2. Verify cron schedule is valid
3. Ensure leases have `status: 'active'`
4. Confirm grace period has actually expired

### Emails not sending?

1. Verify SMTP credentials in .env
2. Check tenant email addresses exist on leases
3. Review console logs for email errors

### Wrong fee amount?

1. Check property-level fee configuration
2. Verify calculation type (percentage vs flat vs daily)
3. Review rent amount on lease

## 📞 Support

For issues or questions, check the main README or contact your development team.

---

**MIT License** - RentKeepers Late Fee System
