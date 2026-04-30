/**
 * Google Calendar Integration Test & Setup
 * 
 * Usage: node test-calendar-setup.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('\n📅 Google Calendar Integration Test');
console.log('===================================\n');

// Check if googleapis is installed
try {
  require('googleapis');
  console.log('✅ googleapis installed');
} catch (error) {
  console.log('❌ googleapis not installed. Run: npm install googleapis\n');
  process.exit(1);
}

// Check if calendar service exists
const servicePath = path.join(__dirname, 'google-calendar-service.js');
if (fs.existsSync(servicePath)) {
  console.log('✅ google-calendar-service.js exists');
} else {
  console.log('❌ google-calendar-service.js not found\n');
  process.exit(1);
}

// Check if calendar routes exist
const routesPath = path.join(__dirname, 'calendar-routes.js');
if (fs.existsSync(routesPath)) {
  console.log('✅ calendar-routes.js exists');
} else {
  console.log('❌ calendar-routes.js not found\n');
  process.exit(1);
}

// Check for credentials
const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || 
  path.join(__dirname, 'google-credentials.json');

console.log('\n🔐 Checking Google Credentials...\n');

if (fs.existsSync(credentialsPath)) {
  console.log('✅ Credentials file found');
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  console.log(`   Client ID: ${credentials.client_id || 'N/A'}`);
  console.log(`   Type: ${credentials.type || 'N/A'}`);
} else {
  console.log('⚠️  Credentials file not found\n');
  console.log('📋 Setup Instructions:\n');
  console.log('1. Go to Google Cloud Console:');
  console.log('   https://console.cloud.google.com/\n');
  console.log('2. Create a new project or select existing\n');
  console.log('3. Enable Google Calendar API:\n');
  console.log('   - Go to "APIs & Services" > "Library"\n');
  console.log('   - Search for "Google Calendar API"\n');
  console.log('   - Click "Enable"\n');
  console.log('4. Create OAuth 2.0 credentials:\n');
  console.log('   - Go to "APIs & Services" > "Credentials"\n');
  console.log('   - Click "Create Credentials" > "OAuth client ID"\n');
  console.log('   - Application type: "Web application"\n');
  console.log('   - Add redirect URI: http://localhost:3000/api/calendar/callback\n');
  console.log('   - Click "Create"\n');
  console.log('5. Download the credentials JSON file\n');
  console.log('6. Save it as: google-credentials.json in the rentkeepers folder\n');
  console.log('   Or set GOOGLE_CREDENTIALS_PATH environment variable\n');
}

// Check for token
const tokenPath = process.env.GOOGLE_TOKEN_PATH || 
  path.join(__dirname, 'google-token.json');

if (fs.existsSync(tokenPath)) {
  console.log('\n✅ OAuth token found (already authorized)');
  const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  console.log(`   Token Type: ${token.token_type || 'N/A'}`);
  console.log(`   Expiry: ${token.expiry_date ? new Date(token.expiry_date).toLocaleString() : 'N/A'}`);
} else {
  console.log('\n⚠️  OAuth token not found (authorization needed)');
  console.log('\n   After adding credentials, run the server and visit:');
  console.log('   http://localhost:3000/api/calendar/auth-url\n');
}

// Validate routes
console.log('\n🔍 Validating API Routes...\n');

const routesContent = fs.readFileSync(routesPath, 'utf8');

const checks = [
  { name: 'GET /auth-url', test: routesContent.includes("router.get('/auth-url'") },
  { name: 'POST /authorize', test: routesContent.includes("router.post('/authorize'") },
  { name: 'GET /events', test: routesContent.includes("router.get('/events'") },
  { name: 'POST /events', test: routesContent.includes("router.post('/events'") },
  { name: 'PUT /events/:id', test: routesContent.includes("router.put('/events/:id'") },
  { name: 'DELETE /events/:id', test: routesContent.includes("router.delete('/events/:id'") },
  { name: 'POST /rent-reminder', test: routesContent.includes("router.post('/events/rent-reminder'") },
  { name: 'POST /maintenance', test: routesContent.includes("router.post('/events/maintenance'") },
  { name: 'POST /showing', test: routesContent.includes("router.post('/events/showing'") },
  { name: 'GET /status', test: routesContent.includes("router.get('/status'") }
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

if (fs.existsSync(credentialsPath) && fs.existsSync(tokenPath)) {
  console.log('✅ Google Calendar is READY!\n');
  console.log('🚀 Next Steps:');
  console.log('   1. Add routes to your server:');
  console.log('      const calendarRoutes = require(\'./calendar-routes\');');
  console.log('      app.use(\'/api/calendar\', calendarRoutes);\n');
  console.log('   2. Start server and test:');
  console.log('      node test-server.js\n');
  console.log('   3. Test API endpoints:');
  console.log('      curl http://localhost:3000/api/calendar/status\n');
} else {
  console.log('⚠️  Google Calendar needs configuration\n');
  console.log('📋 Required Files:');
  console.log(`   ${fs.existsSync(credentialsPath) ? '✅' : '❌'} google-credentials.json`);
  console.log(`   ${fs.existsSync(tokenPath) ? '✅' : '❌'} google-token.json\n`);
  
  if (!fs.existsSync(credentialsPath)) {
    console.log('📝 Create google-credentials.json:');
    console.log('   See setup instructions above\n');
  }
}

console.log('======================================\n');

// Create .env.example if it doesn't exist
const envExample = path.join(__dirname, '.env.calendar.example');
if (!fs.existsSync(envExample)) {
  const envContent = `# Google Calendar Configuration
GOOGLE_CREDENTIALS_PATH=./google-credentials.json
GOOGLE_TOKEN_PATH=./google-token.json
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/callback
`;
  fs.writeFileSync(envExample, envContent);
  console.log('✅ Created .env.calendar.example\n');
}
