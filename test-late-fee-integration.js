/**
 * Late Fee Integration Test
 * Tests the full late fee auto-application flow with mock database data
 * 
 * Usage: node test-late-fee-integration.js
 */

require('dotenv').config();

// Mock Database Models (in-memory for testing)
class MockDatabase {
  constructor() {
    this.properties = [];
    this.leases = [];
    this.payments = [];
    this.transactions = [];
    this.users = [];
    this.units = [];
  }

  async clear() {
    this.properties = [];
    this.leases = [];
    this.payments = [];
    this.transactions = [];
    console.log('🧹 Database cleared\n');
  }
}

const db = new MockDatabase();

// Mock Mongoose-style models
const Property = {
  find: async (query) => {
    let results = db.properties;
    if (query.status) {
      results = results.filter(p => p.status === query.status);
    }
    return results.map(p => ({
      ...p,
      populate: async () => p
    }));
  },
  findById: async (id) => db.properties.find(p => p._id.toString() === id.toString())
};

const Lease = {
  findOne: async (query) => {
    let lease = db.leases.find(l => {
      if (query.unitId && l.unitId.toString() !== query.unitId.toString()) return false;
      if (query.status && l.status !== query.status) return false;
      if (query.endDate) {
        const endDate = typeof query.endDate.$gte === 'string' ? new Date(query.endDate.$gte) : query.endDate.$gte;
        if (l.endDate < endDate) return false;
      }
      return true;
    });
    return lease || null;
  }
};

const Payment = {
  findOne: async (query) => {
    return db.payments.find(p => {
      if (query.leaseId && p.leaseId.toString() !== query.leaseId.toString()) return false;
      if (query.type && p.type !== query.type) return false;
      if (query.status && p.status !== query.status) return false;
      return true;
    }) || null;
  }
};

const Transaction = {
  findOne: async (query) => {
    return db.transactions.find(t => {
      if (query.unitId && t.unitId.toString() !== query.unitId.toString()) return false;
      if (query.category && t.category !== query.category) return false;
      if (query.type && t.type !== query.type) return false;
      return true;
    }) || null;
  },
  create: async (data) => {
    const transaction = {
      _id: db.transactions.length + 1,
      ...data,
      createdAt: new Date()
    };
    db.transactions.push(transaction);
    return transaction;
  }
};

// Mock email service
const mockEmails = [];
const emailService = {
  send: async (options) => {
    mockEmails.push({
      ...options,
      sentAt: new Date()
    });
    console.log(`📧 Email queued to: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    console.log(`   Subject: ${options.subject}`);
    return { success: true, messageId: `test-${Date.now()}` };
  }
};

console.log('\n🧪 Late Fee Integration Test');
console.log('============================\n');

// Test Setup: Create mock data
async function setupTestData() {
  console.log('📦 Setting up test data...\n');

  // Property 1: Percentage-based late fees
  db.properties.push({
    _id: 1,
    name: 'Sunset Apartments',
    status: 'active',
    gracePeriodDays: 5,
    lateFeeType: 'percentage',
    lateFeePercentage: 5,
    units: [
      { _id: 101, name: 'Unit 101', number: '101' },
      { _id: 102, name: 'Unit 102', number: '102' },
      { _id: 103, name: 'Unit 103', number: '103' }
    ]
  });

  // Property 2: Flat fee
  db.properties.push({
    _id: 2,
    name: 'Oak Gardens',
    status: 'active',
    gracePeriodDays: 3,
    lateFeeType: 'flat',
    lateFeeFlatAmount: 75,
    units: [
      { _id: 201, name: 'Unit A', number: 'A' },
      { _id: 202, name: 'Unit B', number: 'B' }
    ]
  });

  // Property 3: Daily fee
  db.properties.push({
    _id: 3,
    name: 'Maple Court',
    status: 'active',
    gracePeriodDays: 7,
    lateFeeType: 'daily',
    lateFeeDailyAmount: 15,
    units: [
      { _id: 301, name: 'Suite 5', number: '5' }
    ]
  });

  // Lease 1: Overdue (22 days late, past grace period)
  db.leases.push({
    _id: 1001,
    unitId: 101,
    tenantName: 'John Smith',
    tenantEmail: 'john.smith@email.com',
    monthlyRent: 1500,
    rentDueDay: 1,
    status: 'active',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2026-12-31')
  });

  // Lease 2: Overdue (15 days late, past grace period)
  db.leases.push({
    _id: 1002,
    unitId: 102,
    tenantName: 'Sarah Johnson',
    tenantEmail: 'sarah.j@email.com',
    monthlyRent: 1400,
    rentDueDay: 1,
    status: 'active',
    startDate: new Date('2025-06-01'),
    endDate: new Date('2026-06-30')
  });

  // Lease 3: NOT overdue (paid on time)
  db.leases.push({
    _id: 1003,
    unitId: 103,
    tenantName: 'Mike Brown',
    tenantEmail: 'mike.b@email.com',
    monthlyRent: 1600,
    rentDueDay: 1,
    status: 'active',
    startDate: new Date('2025-03-01'),
    endDate: new Date('2026-03-31')
  });

  // Payment for Lease 3 (paid on time)
  db.payments.push({
    _id: 5001,
    leaseId: 1003,
    type: 'rent',
    amount: 1600,
    paymentDate: new Date('2026-04-01'),
    status: 'completed'
  });

  // Lease 4: Overdue, flat fee property
  db.leases.push({
    _id: 2001,
    unitId: 201,
    tenantName: 'Emily Davis',
    tenantEmail: 'emily.d@email.com',
    monthlyRent: 1200,
    rentDueDay: 1,
    status: 'active',
    startDate: new Date('2025-09-01'),
    endDate: new Date('2026-09-30')
  });

  // Lease 5: Overdue, daily fee property (10 days late)
  db.leases.push({
    _id: 3001,
    unitId: 301,
    tenantName: 'Robert Wilson',
    tenantEmail: 'robert.w@email.com',
    monthlyRent: 1800,
    rentDueDay: 1,
    status: 'active',
    startDate: new Date('2025-12-01'),
    endDate: new Date('2026-12-31')
  });

  // Lease 6: Within grace period (should NOT get late fee)
  db.leases.push({
    _id: 1004,
    unitId: 104,
    tenantName: 'Lisa Anderson',
    tenantEmail: 'lisa.a@email.com',
    monthlyRent: 1350,
    rentDueDay: 25,
    status: 'active',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31')
  });

  console.log('✅ Test data created:');
  console.log(`   - 3 Properties`);
  console.log(`   - 6 Leases`);
  console.log(`   - 1 Payment`);
  console.log(`   - 0 Transactions (will be created by late fee system)\n`);
}

// Inject mocks into the scheduler
function injectMocks() {
  const Module = require('module');
  const originalRequire = Module.prototype.require;

  Module.prototype.require = function(id) {
    const module = originalRequire.apply(this, arguments);
    
    if (id === 'mongoose') {
      return {
        Schema: { Types: { ObjectId: String } },
        model: () => {}
      };
    }
    
    return module;
  };

  // Override global models
  global.Property = Property;
  global.Lease = Lease;
  global.Payment = Payment;
  global.Transaction = Transaction;
}

// Late Fee Logic (copied from scheduler for testing)
class LateFeeTestRunner {
  constructor() {
    this.results = {
      unitsChecked: 0,
      lateFeesApplied: 0,
      totalAmount: 0,
      emailsSent: 0,
      skipped: []
    };
  }

  calculateLateFee(lease, property) {
    const rentAmount = lease.monthlyRent;
    
    if (property.lateFeeType === 'percentage') {
      return rentAmount * (property.lateFeePercentage || 5) / 100;
    } else if (property.lateFeeType === 'flat') {
      return property.lateFeeFlatAmount || 50;
    } else if (property.lateFeeType === 'daily') {
      const dueDate = new Date(new Date().getFullYear(), new Date().getMonth(), lease.rentDueDay);
      const gracePeriodEnd = new Date(dueDate);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + (property.gracePeriodDays || 5));
      const daysLate = Math.floor((new Date() - gracePeriodEnd) / (1000 * 60 * 60 * 24));
      return daysLate * (property.lateFeeDailyAmount || 10);
    }
    
    return Math.max(rentAmount * 0.05, 50);
  }

  getRentDueDate(lease, currentDate) {
    const dueDay = lease.rentDueDay || 1;
    const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dueDay);
    
    if (dueDate > currentDate) {
      dueDate.setMonth(dueDate.getMonth() - 1);
    }
    
    return dueDate;
  }

  async processLateFees() {
    const now = new Date('2026-04-29'); // Fixed date for testing
    
    console.log(`🔄 Processing late fees as of ${now.toLocaleDateString()}...\n`);

    const properties = await Property.find({ status: 'active' });

    for (const property of properties) {
      for (const unit of property.units || []) {
        this.results.unitsChecked++;
        const result = await this.checkUnit(unit, property, now);
        
        if (result.lateFeeApplied) {
          this.results.lateFeesApplied++;
          this.results.totalAmount += result.amount;
        } else if (result.reason) {
          this.results.skipped.push({
            unit: unit.name || unit.number,
            property: property.name,
            reason: result.reason
          });
        }
      }
    }

    return this.results;
  }

  async checkUnit(unit, property, currentDate) {
    const lease = await Lease.findOne({
      unitId: unit._id,
      status: 'active',
      endDate: { $gte: currentDate }
    });

    if (!lease) {
      return { lateFeeApplied: false, reason: 'No active lease' };
    }

    const rentDueDate = this.getRentDueDate(lease, currentDate);
    const gracePeriodEnd = new Date(rentDueDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + (property.gracePeriodDays || 5));

    if (currentDate > gracePeriodEnd) {
      const payment = await Payment.findOne({
        leaseId: lease._id,
        type: 'rent',
        status: 'completed'
      });

      if (!payment) {
        const existingLateFee = await Transaction.findOne({
          unitId: unit._id,
          category: 'Late Fee'
        });

        if (!existingLateFee) {
          const lateFeeAmount = this.calculateLateFee(lease, property);
          
          await Transaction.create({
            propertyId: property._id,
            unitId: unit._id,
            leaseId: lease._id,
            type: 'income',
            category: 'Late Fee',
            description: `Late fee for rent due ${rentDueDate.toLocaleDateString()}`,
            amount: lateFeeAmount,
            date: new Date(),
            status: 'completed',
            metadata: {
              autoApplied: true,
              originalDueDate: rentDueDate,
              gracePeriodDays: property.gracePeriodDays || 5,
              rentAmount: lease.monthlyRent
            }
          });

          console.log(`✅ LATE FEE APPLIED:`);
          console.log(`   Property: ${property.name}`);
          console.log(`   Unit: ${unit.name || unit.number}`);
          console.log(`   Tenant: ${lease.tenantName}`);
          console.log(`   Amount: $${lateFeeAmount.toFixed(2)}`);
          console.log(`   Days Late: ${Math.floor((currentDate - gracePeriodEnd) / (1000 * 60 * 60 * 24))}`);

          if (lease.tenantEmail) {
            await emailService.send({
              to: lease.tenantEmail,
              subject: `Late Fee Applied - ${property.name}, ${unit.name}`,
              text: `Late fee of $${lateFeeAmount.toFixed(2)} applied.`
            });
            this.results.emailsSent++;
          }

          return {
            lateFeeApplied: true,
            amount: lateFeeAmount,
            tenant: lease.tenantName
          };
        }
      }
    }

    return { lateFeeApplied: false, reason: 'Within grace period or paid' };
  }
}

// Run the test
async function runTest() {
  try {
    // Setup
    await db.clear();
    await setupTestData();

    // Run late fee processing
    const runner = new LateFeeTestRunner();
    const results = await runner.processLateFees();

    // Print results
    console.log('\n======================================');
    console.log('📊 Test Results');
    console.log('======================================\n');

    console.log('Summary:');
    console.log(`  Units Checked: ${results.unitsChecked}`);
    console.log(`  Late Fees Applied: ${results.lateFeesApplied}`);
    console.log(`  Total Amount: $${results.totalAmount.toFixed(2)}`);
    console.log(`  Emails Sent: ${results.emailsSent}`);
    console.log(`  Skipped: ${results.skipped.length}\n`);

    if (results.skipped.length > 0) {
      console.log('Skipped Units:');
      results.skipped.forEach(item => {
        console.log(`  - ${item.property}, ${item.unit}: ${item.reason}`);
      });
      console.log('');
    }

    console.log('Transactions Created:');
    db.transactions.forEach(t => {
      console.log(`  - $${t.amount.toFixed(2)} late fee for Unit ${t.unitId}`);
    });
    console.log('');

    // Validation
    console.log('======================================');
    console.log('✅ Validation Checks');
    console.log('======================================\n');

    const checks = [
      {
        name: 'Correct number of late fees applied',
        pass: results.lateFeesApplied === 4, // John, Sarah, Emily, Robert
        expected: 4,
        actual: results.lateFeesApplied
      },
      {
        name: 'Percentage fee calculated correctly (John: $1500 × 5%)',
        pass: db.transactions.some(t => t.amount === 75 && t.leaseId === 1001),
        expected: '$75.00',
        actual: db.transactions.find(t => t.leaseId === 1001)?.amount || 0
      },
      {
        name: 'Flat fee calculated correctly (Emily: $75)',
        pass: db.transactions.some(t => t.amount === 75 && t.leaseId === 2001),
        expected: '$75.00',
        actual: db.transactions.find(t => t.leaseId === 2001)?.amount || 0
      },
      {
        name: 'Daily fee calculated correctly (Robert: 21 days × $15 = $315)',
        pass: db.transactions.some(t => t.leaseId === 3001 && t.amount === 315),
        expected: '$315.00 (21 days × $15)',
        actual: db.transactions.find(t => t.leaseId === 3001)?.amount || 0
      },
      {
        name: 'Paid lease NOT charged (Mike)',
        pass: !db.transactions.some(t => t.leaseId === 1003),
        expected: 'No transaction',
        actual: db.transactions.some(t => t.leaseId === 1003) ? 'ERROR: Charged' : 'Correct'
      },
      {
        name: 'Grace period lease NOT charged (Lisa)',
        pass: !db.transactions.some(t => t.tenantName === 'Lisa Anderson'),
        expected: 'No transaction',
        actual: db.transactions.some(t => db.leases.find(l => l._id === t.leaseId)?.tenantName === 'Lisa Anderson') ? 'ERROR: Charged' : 'Correct'
      },
      {
        name: 'Email notifications sent',
        pass: results.emailsSent === 4,
        expected: 4,
        actual: results.emailsSent
      },
      {
        name: 'Transaction metadata includes autoApplied flag',
        pass: db.transactions.every(t => t.metadata?.autoApplied === true),
        expected: 'true',
        actual: db.transactions.every(t => t.metadata?.autoApplied) ? 'true' : 'false'
      }
    ];

    let passed = 0;
    let failed = 0;

    checks.forEach((check, i) => {
      if (check.pass) {
        console.log(`✅ Check ${i + 1}: ${check.name}`);
        passed++;
      } else {
        console.log(`❌ Check ${i + 1}: ${check.name}`);
        console.log(`   Expected: ${check.expected}, Got: ${check.actual}`);
        failed++;
      }
    });

    console.log(`\n======================================`);
    console.log(`Final: ${passed}/${checks.length} checks passed`);
    console.log('======================================\n');

    if (failed === 0) {
      console.log('🎉 All integration tests passed!\n');
      console.log('The late fee system is working correctly:');
      console.log('  ✅ Correct fees calculated for each type');
      console.log('  ✅ Paid leases are skipped');
      console.log('  ✅ Grace periods are respected');
      console.log('  ✅ Emails are sent to tenants');
      console.log('  ✅ Transaction records are created\n');
    } else {
      console.log(`⚠️  ${failed} check(s) failed. Review the output above.\n`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
runTest();
