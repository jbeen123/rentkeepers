/**
 * RentKeepers Mobile App - Connection Test
 * 
 * Run: node test-connection.js
 * 
 * Tests if the mobile app can reach the backend server
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

console.log('\n📱 RentKeepers Mobile App - Connection Test');
console.log('============================================\n');
console.log(`🔌 Testing backend at: ${API_BASE_URL}\n`);

async function testConnection() {
  const tests = [
    { name: 'Backend Health', endpoint: '/api/health' },
    { name: 'Stripe Status', endpoint: '/api/stripe/health' },
    { name: 'Documents API', endpoint: '/api/documents' },
    { name: 'Properties', endpoint: '/api/properties' },
    { name: 'ICS Calendar', endpoint: '/api/ics/sample' },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const response = await fetch(`${API_BASE_URL}${test.endpoint}`);
      
      // Handle both JSON and non-JSON responses
      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      if (response.ok) {
        console.log(`✅ ${test.name}`);
        console.log(`   ${test.endpoint} → OK\n`);
        passed++;
      } else {
        console.log(`⚠️  ${test.name}`);
        console.log(`   ${test.endpoint} → HTTP ${response.status}\n`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}`);
      console.log(`   ${test.endpoint} → ${error.message}\n`);
      failed++;
    }
  }

  console.log('============================================');
  console.log(`📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✅ All connections successful!');
    console.log('📱 Mobile app is ready to connect.\n');
  } else {
    console.log('⚠️  Some connections failed.');
    console.log('\n📋 Troubleshooting:');
    console.log('   1. Make sure backend server is running:');
    console.log('      cd /home/jahffy/.openclaw/workspace/rentkeepers');
    console.log('      node main-server.js\n');
    console.log('   2. Check firewall settings');
    console.log('   3. For mobile devices, use your machine\'s IP instead of localhost');
    console.log('      Example: http://192.168.1.100:3000\n');
  }

  // Test Stripe specifically
  console.log('\n💳 Stripe Integration Test:');
  try {
    const stripeTest = await fetch(`${API_BASE_URL}/api/stripe/test-mode`);
    const stripeData = await stripeTest.json();
    console.log(`   Mode: ${stripeData.testMode ? '✅ TEST' : '⚠️ LIVE'}`);
    console.log(`   Key: ${stripeData.keyPrefix || 'Not configured'}\n`);
  } catch (error) {
    console.log(`   ❌ Stripe not accessible: ${error.message}\n`);
  }
}

testConnection().catch(console.error);
