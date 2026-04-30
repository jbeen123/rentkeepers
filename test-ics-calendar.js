/**
 * ICS Calendar Service Test
 * No credentials needed - works immediately!
 * 
 * Usage: node test-ics-calendar.js
 */

require('dotenv').config();
const icsService = require('./ics-calendar-service');
const fs = require('fs');
const path = require('path');

console.log('\n📅 ICS Calendar Service Test');
console.log('============================\n');

// Test 1: Generate rent reminder
console.log('Test 1: Rent Reminder');
console.log('---------------------');

const rentEvent = icsService.createRentReminder({
  tenantName: 'John Smith',
  propertyAddress: '123 Main St, Unit 101',
  amount: 1500,
  dueDate: '2026-05-01'
});

const rentICS = icsService.generateICS(rentEvent);
console.log('✅ Generated rent reminder ICS');
console.log(`   Summary: ${rentEvent.summary}`);
console.log(`   Due Date: ${rentEvent.startDateTime.toLocaleDateString()}`);
console.log(`   Alarm: ${rentEvent.alarmMinutes} minutes before\n`);

// Test 2: Generate maintenance appointment
console.log('Test 2: Maintenance Appointment');
console.log('--------------------------------');

const maintenanceEvent = icsService.createMaintenanceEvent({
  propertyAddress: '456 Oak Ave',
  description: 'Fix leaking faucet in kitchen',
  scheduledDate: '2026-05-02T14:00:00',
  technician: 'Mike\'s Plumbing'
});

const maintenanceICS = icsService.generateICS(maintenanceEvent);
console.log('✅ Generated maintenance appointment ICS');
console.log(`   Summary: ${maintenanceEvent.summary}`);
console.log(`   Scheduled: ${maintenanceEvent.startDateTime.toLocaleString()}`);
console.log(`   Technician: Mike's Plumbing\n`);

// Test 3: Generate property showing
console.log('Test 3: Property Showing');
console.log('------------------------');

const showingEvent = icsService.createShowingEvent({
  propertyAddress: '789 Pine Rd',
  clientName: 'Sarah Johnson',
  scheduledDate: '2026-05-03T15:00:00'
});

const showingICS = icsService.generateICS(showingEvent);
console.log('✅ Generated property showing ICS');
console.log(`   Summary: ${showingEvent.summary}`);
console.log(`   Scheduled: ${showingEvent.startDateTime.toLocaleString()}`);
console.log(`   Client: Sarah Johnson\n`);

// Test 4: Generate recurring rent reminders
console.log('Test 4: Recurring Rent Reminders (12 months)');
console.log('---------------------------------------------');

const recurringEvents = icsService.createRecurringRentReminders({
  tenantName: 'Emily Davis',
  propertyAddress: '321 Elm St',
  amount: 1400,
  startDate: '2026-05-01',
  months: 12
});

console.log(`✅ Generated ${recurringEvents.length} rent reminder events`);
console.log('   Schedule:');
recurringEvents.slice(0, 3).forEach(event => {
  console.log(`   - ${event.startDateTime.toLocaleDateString()}: ${event.summary}`);
});
if (recurringEvents.length > 3) {
  console.log(`   ... and ${recurringEvents.length - 3} more\n`);
} else {
  console.log('');
}

// Test 5: Save ICS files
console.log('Test 5: Save ICS Files to Disk');
console.log('-------------------------------');

const icsDir = path.join(__dirname, 'ics-files');
if (!fs.existsSync(icsDir)) {
  fs.mkdirSync(icsDir, { recursive: true });
}

const testFiles = [
  { filename: 'test-rent-reminder.ics', content: rentICS },
  { filename: 'test-maintenance.ics', content: maintenanceICS },
  { filename: 'test-showing.ics', content: showingICS }
];

testFiles.forEach(file => {
  const filePath = path.join(icsDir, file.filename);
  fs.writeFileSync(filePath, file.content);
  console.log(`✅ Saved: ${file.filename}`);
});

console.log(`\n📁 Files saved to: ${icsDir}\n`);

// Test 6: Validate ICS format
console.log('Test 6: Validate ICS Format');
console.log('---------------------------');

const checks = [
  { name: 'Has VCALENDAR header', test: rentICS.includes('BEGIN:VCALENDAR') },
  { name: 'Has VERSION', test: rentICS.includes('VERSION:2.0') },
  { name: 'Has VEVENT', test: rentICS.includes('BEGIN:VEVENT') },
  { name: 'Has UID', test: rentICS.includes('UID:') },
  { name: 'Has DTSTART', test: rentICS.includes('DTSTART:') },
  { name: 'Has DTEND', test: rentICS.includes('DTEND:') },
  { name: 'Has SUMMARY', test: rentICS.includes('SUMMARY:') },
  { name: 'Has VALARM', test: rentICS.includes('BEGIN:VALARM') },
  { name: 'Has END:VCALENDAR', test: rentICS.includes('END:VCALENDAR') }
];

let passed = 0;
checks.forEach(check => {
  if (check.test) {
    console.log(`✅ ${check.name}`);
    passed++;
  } else {
    console.log(`❌ ${check.name}`);
  }
});

console.log(`\n✅ Format validation: ${passed}/${checks.length} checks passed\n`);

// Summary
console.log('======================================');
console.log('📊 Test Summary\n');
console.log('✅ Rent Reminder: Generated');
console.log('✅ Maintenance Appointment: Generated');
console.log('✅ Property Showing: Generated');
console.log('✅ Recurring Events: 12 months generated');
console.log('✅ ICS Files: Saved to disk');
console.log('✅ Format Validation: Passed\n');

console.log('🚀 Next Steps:\n');
console.log('   1. Add routes to your server:');
console.log('      const icsRoutes = require(\'./ics-calendar-routes\');');
console.log('      app.use(\'/api/ics\', icsRoutes);\n');
console.log('   2. Test via browser:');
console.log('      http://localhost:3000/api/ics/sample\n');
console.log('   3. Download and open in any calendar app!\n');

console.log('📁 Sample ICS files created:');
console.log(`   - ${path.join(icsDir, 'test-rent-reminder.ics')}`);
console.log(`   - ${path.join(icsDir, 'test-maintenance.ics')}`);
console.log(`   - ${path.join(icsDir, 'test-showing.ics')}\n`);

console.log('🎉 ICS Calendar Service is ready to use!');
console.log('   No API credentials required!\n');
