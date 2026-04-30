/**
 * Email Test Script for RentKeepers
 * 
 * Usage: node test-email.js your-email@example.com
 * 
 * This tests the email service without needing a full database setup.
 */

require('dotenv').config();
const emailService = require('./email-service');

async function testEmail() {
  const testRecipient = process.argv[2] || process.env.TEST_EMAIL;

  if (!testRecipient) {
    console.log('\n❌ No recipient specified!\n');
    console.log('Usage: node test-email.js your-email@example.com\n');
    console.log('Or set TEST_EMAIL in your .env file\n');
    process.exit(1);
  }

  console.log('\n📧 RentKeepers Email Test');
  console.log('========================\n');
  console.log(`Sending test email to: ${testRecipient}\n`);

  // Check if SMTP is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('⚠️  SMTP credentials not configured!\n');
    console.log('Add these to your .env file:\n');
    console.log('  SMTP_HOST=smtp.gmail.com');
    console.log('  SMTP_PORT=587');
    console.log('  SMTP_USER=your-email@gmail.com');
    console.log('  SMTP_PASS=your-app-password');
    console.log('  SMTP_FROM_NAME=RentKeepers\n');
    console.log('For Gmail, you need an App Password:');
    console.log('https://support.google.com/accounts/answer/185833\n');
    
    // Still try to send in case env vars are set elsewhere
  }

  try {
    const result = await emailService.sendTestEmail(testRecipient);
    console.log('✅ Email sent successfully!\n');
    console.log('Message ID:', result.messageId);
    console.log('\nCheck your inbox (and spam folder) for the test email.\n');
  } catch (error) {
    console.log('❌ Failed to send email\n');
    console.log('Error:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('  1. Check SMTP credentials in .env');
    console.log('  2. For Gmail, use an App Password, not your regular password');
    console.log('  3. Make sure "Less secure app access" is enabled (or use App Password)');
    console.log('  4. Check your firewall/network settings\n');
    process.exit(1);
  }
}

testEmail();
