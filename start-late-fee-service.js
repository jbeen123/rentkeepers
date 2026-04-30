/**
 * Start Late Fee Service
 * Initializes and runs the late fee auto-application scheduler
 * 
 * Usage: node start-late-fee-service.js
 */

require('dotenv').config();
const lateFeeScheduler = require('./late-fee-scheduler');

console.log('\n🚀 Starting Late Fee Auto-Application Service');
console.log('============================================\n');

// Configuration
const config = {
  schedule: process.env.LATE_FEE_SCHEDULE || '0 3 * * *', // Daily at 3 AM
  timezone: 'America/New_York',
  enabled: process.env.LATE_FEE_ENABLED !== 'false'
};

console.log('Configuration:');
console.log(`  Schedule: ${config.schedule}`);
console.log(`  Timezone: ${config.timezone}`);
console.log(`  Enabled: ${config.enabled}`);
console.log(`  Admin Email: ${process.env.ADMIN_EMAIL || 'Not configured'}`);
console.log('');

if (!config.enabled) {
  console.log('⚠️  Late fee service is disabled (LATE_FEE_ENABLED=false)');
  console.log('Set LATE_FEE_ENABLED=true in .env to enable\n');
  process.exit(0);
}

// Start the scheduler
try {
  lateFeeScheduler.start(config.schedule);
  
  console.log('\n✅ Late fee service started successfully!\n');
  console.log('The service will:');
  console.log('  - Check for overdue rent daily at 3:00 AM');
  console.log('  - Apply late fees after grace period expires');
  console.log('  - Send email notices to tenants');
  console.log('  - Send daily summary to admin\n');
  
  console.log('To test immediately, run:');
  console.log('  node test-late-fee-integration.js\n');
  
  // Keep the process running
  console.log('Service running... (Press Ctrl+C to stop)\n');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nShutting down late fee service...');
    process.exit(0);
  });
  
} catch (error) {
  console.error('❌ Failed to start late fee service:', error.message);
  process.exit(1);
}
