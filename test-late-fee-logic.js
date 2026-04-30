/**
 * Late Fee Logic Test Script
 * Tests the late fee calculation and application logic without database
 * 
 * Usage: node test-late-fee-logic.js
 */

require('dotenv').config();

console.log('\n🧪 Late Fee Auto-Application Logic Test');
console.log('======================================\n');

// Test 1: Late Fee Calculation
console.log('Test 1: Late Fee Calculation Logic');
console.log('-----------------------------------');

const testCases = [
  {
    name: 'Percentage-based (5%)',
    rent: 1500,
    property: { lateFeeType: 'percentage', lateFeePercentage: 5 },
    expected: 75
  },
  {
    name: 'Flat fee ($50)',
    rent: 1500,
    property: { lateFeeType: 'flat', lateFeeFlatAmount: 50 },
    expected: 50
  },
  {
    name: 'Daily fee ($10/day × 3 days)',
    rent: 1500,
    property: { lateFeeType: 'daily', lateFeeDailyAmount: 10 },
    daysLate: 3,
    expected: 30
  },
  {
    name: 'Default (5% or $50 min)',
    rent: 800,
    property: {},
    expected: 50 // 5% of 800 = 40, but min is 50
  },
  {
    name: 'Default high rent (5%)',
    rent: 2000,
    property: {},
    expected: 100 // 5% of 2000 = 100
  }
];

function calculateLateFee(rent, property, daysLate = 0) {
  if (property.lateFeeType === 'percentage') {
    return rent * property.lateFeePercentage / 100;
  } else if (property.lateFeeType === 'flat') {
    return property.lateFeeFlatAmount || 50;
  } else if (property.lateFeeType === 'daily') {
    return daysLate * (property.lateFeeDailyAmount || 10);
  }
  // Default: 5% or $50, whichever is greater
  return Math.max(rent * 0.05, 50);
}

let passed = 0;
let failed = 0;

testCases.forEach(test => {
  const result = calculateLateFee(test.rent, test.property, test.daysLate);
  const success = Math.abs(result - test.expected) < 0.01;
  
  if (success) {
    console.log(`✅ ${test.name}: $${result.toFixed(2)} (expected $${test.expected.toFixed(2)})`);
    passed++;
  } else {
    console.log(`❌ ${test.name}: $${result.toFixed(2)} (expected $${test.expected.toFixed(2)})`);
    failed++;
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

// Test 2: Grace Period Logic
console.log('Test 2: Grace Period Logic');
console.log('--------------------------');

const today = new Date('2026-04-29');
const rentDueDay = 1; // 1st of month
const gracePeriodDays = 5;

const rentDueDate = new Date(today.getFullYear(), today.getMonth(), rentDueDay);
const gracePeriodEnd = new Date(rentDueDate);
gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);

console.log(`Today: ${today.toLocaleDateString()}`);
console.log(`Rent Due Date: ${rentDueDate.toLocaleDateString()}`);
console.log(`Grace Period Ends: ${gracePeriodEnd.toLocaleDateString()}`);

const isPastGracePeriod = today > gracePeriodEnd;
console.log(`Past Grace Period: ${isPastGracePeriod ? '✅ YES' : '❌ NO'}`);

if (isPastGracePeriod) {
  const daysLate = Math.floor((today - gracePeriodEnd) / (1000 * 60 * 60 * 24));
  console.log(`Days Late: ${daysLate} days\n`);
} else {
  console.log('Still within grace period\n');
}

// Test 3: Cron Schedule Validation
console.log('Test 3: Cron Schedule Configuration');
console.log('------------------------------------');

const cron = require('node-cron');

const schedules = [
  { name: 'Daily at 3 AM', schedule: '0 3 * * *' },
  { name: 'Daily at 1 AM', schedule: '0 1 * * *' },
  { name: 'Every 6 hours', schedule: '0 */6 * * *' },
  { name: 'Monthly on 1st', schedule: '0 2 1 * *' }
];

schedules.forEach(test => {
  try {
    const task = cron.schedule(test.schedule, () => {}, { scheduled: false });
    console.log(`✅ ${test.schedule} - ${test.name}`);
    task.stop();
  } catch (error) {
    console.log(`❌ ${test.schedule} - ${test.name}: ${error.message}`);
  }
});

// Summary
console.log('\n======================================');
console.log('Test Summary');
console.log('======================================\n');

if (failed === 0) {
  console.log('✅ All late fee logic tests passed!\n');
  console.log('Next steps:');
  console.log('1. Set up test database with sample leases');
  console.log('2. Run: node test-late-fee-integration.js');
  console.log('3. Configure cron schedule in late-fee-scheduler.js');
  console.log('4. Start scheduler: node start-late-fee-service.js\n');
} else {
  console.log(`⚠️  ${failed} test(s) failed. Review the logic above.\n`);
}

module.exports = { calculateLateFee };
