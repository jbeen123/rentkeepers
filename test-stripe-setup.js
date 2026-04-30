/**
 * Stripe Autopay Setup Test
 * 
 * Usage: node test-stripe-setup.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('\n💳 Stripe Autopay Setup Test');
console.log('============================\n');

// Check if stripe is installed
try {
  const stripe = require('stripe');
  console.log('✅ Stripe package installed');
} catch (error) {
  console.log('❌ Stripe not installed. Run: npm install stripe\n');
  process.exit(1);
}

// Check if stripe service exists
const servicePath = path.join(__dirname, 'stripe-service.js');
if (fs.existsSync(servicePath)) {
  console.log('✅ stripe-service.js exists');
} else {
  console.log('❌ stripe-service.js not found\n');
  process.exit(1);
}

// Check if stripe routes exist
const routesPath = path.join(__dirname, 'stripe-routes.js');
if (fs.existsSync(routesPath)) {
  console.log('✅ stripe-routes.js exists');
} else {
  console.log('❌ stripe-routes.js not found\n');
  process.exit(1);
}

// Check for Stripe API key
console.log('\n🔐 Checking Stripe API Key...\n');

const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  console.log('⚠️  STRIPE_SECRET_KEY not set in .env\n');
  console.log('📋 Setup Instructions:\n');
  console.log('1. Go to Stripe Dashboard:');
  console.log('   https://dashboard.stripe.com/test/apikeys\n');
  console.log('2. Copy your test secret key (starts with sk_test_)\n');
  console.log('3. Add to your .env file:\n');
  console.log('   STRIPE_SECRET_KEY=sk_test_...\n');
  console.log('4. Run this test again\n');
} else {
  const isTestMode = stripeKey.startsWith('sk_test_');
  console.log(`✅ Stripe API Key found`);
  console.log(`   Mode: ${isTestMode ? '✅ TEST' : '⚠️ LIVE'}`);
  console.log(`   Key: ${stripeKey.substring(0, 12)}...\n`);
  
  if (!isTestMode) {
    console.log('⚠️  WARNING: Using LIVE Stripe key!\n');
    console.log('For testing, use test keys from:');
    console.log('https://dashboard.stripe.com/test/apikeys\n');
  }
}

// Validate routes
console.log('🔍 Validating API Routes...\n');

const routesContent = fs.readFileSync(routesPath, 'utf8');

const checks = [
  { name: 'GET /health', test: routesContent.includes("router.get('/health'") },
  { name: 'POST /customer', test: routesContent.includes("router.post('/customer'") },
  { name: 'POST /setup-intent', test: routesContent.includes("router.post('/setup-intent'") },
  { name: 'POST /autopay/setup', test: routesContent.includes("router.post('/autopay/setup'") },
  { name: 'POST /payment', test: routesContent.includes("router.post('/payment'") },
  { name: 'GET /payment-methods', test: routesContent.includes("router.get('/payment-methods'") },
  { name: 'GET /subscriptions', test: routesContent.includes("router.get('/subscriptions'") },
  { name: 'DELETE /subscription', test: routesContent.includes("router.delete('/subscription'") },
  { name: 'POST /invoice', test: routesContent.includes("router.post('/invoice'") },
  { name: 'POST /refund', test: routesContent.includes("router.post('/refund'") },
  { name: 'POST /webhook', test: routesContent.includes("router.post('/webhook'") }
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

console.log(`\n✅ Route validation: ${passed}/${checks.length} checks passed\n`);

// Summary
console.log('======================================');
console.log('📊 Setup Summary\n');

if (stripeKey && stripeKey.startsWith('sk_test_')) {
  console.log('✅ Stripe is READY for testing!\n');
  console.log('🚀 Next Steps:\n');
  console.log('   1. Add routes to your server:');
  console.log('      const stripeRoutes = require(\'./stripe-routes\');');
  console.log('      app.use(\'/api/stripe\', stripeRoutes);\n');
  console.log('   2. Start server and test:');
  console.log('      node main-server.js\n');
  console.log('   3. Test API endpoints:');
  console.log('      curl http://localhost:3000/api/stripe/health\n');
  console.log('   4. Get your test card numbers:');
  console.log('      https://stripe.com/docs/testing#cards\n');
} else {
  console.log('⚠️  Stripe needs API key configuration\n');
  console.log('📋 Required in .env:');
  console.log(`   ${stripeKey ? '✅' : '❌'} STRIPE_SECRET_KEY\n`);
}

console.log('======================================\n');

// Create test cards reference
console.log('💳 Test Card Numbers (Test Mode Only):\n');
console.log('   Success: 4242 4242 4242 4242');
console.log('   Decline: 4000 0000 0000 0002');
console.log('   Insufficient Funds: 4000 0000 0000 9995');
console.log('   Lost Card: 4000 0000 0000 9987');
console.log('\n   Use any future expiry date');
console.log('   Use any 3-digit CVC (e.g., 123)\n');

console.log('📖 Documentation:');
console.log('   https://stripe.com/docs/testing\n');
console.log('   https://stripe.com/docs/api\n');
