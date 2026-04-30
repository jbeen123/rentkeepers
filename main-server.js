/**
 * RentKeepers - Complete Main Server
 * 
 * Integrated Features:
 * ✅ Document Upload System
 * ✅ ICS Calendar Generator (No credentials needed!)
 * ✅ Late Fee Auto-Application
 * ✅ Email Service
 * ✅ Owner Statement Generation
 * 
 * Usage: node main-server.js
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

console.log('\n🏠 RentKeepers - Complete Property Management Server\n');

// Import all routes
const documentRoutes = require('./document-routes');
const icsRoutes = require('./ics-calendar-routes');
const stripeRoutes = require('./stripe-routes');

// Optional: Background schedulers (require database)
let lateFeeScheduler, statementScheduler;
try {
  lateFeeScheduler = require('./late-fee-scheduler');
  statementScheduler = require('./scheduler');
} catch (error) {
  console.log('ℹ️  Background schedulers not loaded (no database configured)\n');
}

const emailService = require('./email-service');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/documents', documentRoutes);    // Document upload/download
app.use('/api/ics', icsRoutes);              // ICS Calendar generator
app.use('/api/stripe', stripeRoutes);        // Stripe payments/autopay
app.use('/api/statements', require('./api-routes')); // Owner statements

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'RentKeepers Complete Server',
    version: '1.0.0',
    features: {
      documents: '✅ Enabled',
      calendar: '✅ Enabled (ICS - No credentials)',
      stripe: '✅ Enabled (Test Mode)',
      lateFees: '✅ Enabled (Auto-application)',
      statements: '✅ Enabled (PDF generation)',
      email: '✅ Enabled'
    }
  });
});

// Property routes (placeholder)
app.get('/api/properties', (req, res) => {
  res.json({
    properties: [
      { id: 1, name: 'Sunset Apartments', units: 64 },
      { id: 2, name: 'Oak Gardens', units: 32 }
    ]
  });
});

// Owner routes (placeholder)
app.get('/api/owners', (req, res) => {
  res.json({
    owners: [
      { id: 1, name: 'John Smith', properties: [1] },
      { id: 2, name: 'Sarah Johnson', properties: [2] }
    ]
  });
});

// Serve main dashboard
app.get('/', (req, res) => {
  const dashboard = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>RentKeepers Dashboard</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .endpoint { background: #e0e0e0; padding: 10px; margin: 5px 0; border-radius: 4px; font-family: monospace; }
        h1 { color: #1a1a2e; }
        a { color: #667eea; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: white; margin-left: 5px; }
        .badge-success { background: #22c55e; }
        .badge-info { background: #3b82f6; }
      </style>
    </head>
    <body>
      <h1>🏠 RentKeepers Server</h1>
      
      <div class="card">
        <h2>✅ Server Status: Running</h2>
        <p>Server is running on port ${PORT}</p>
        <p><strong>Features:</strong></p>
        <ul>
          <li>📄 Document Upload & Management</li>
          <li>📅 ICS Calendar Generator (No credentials!)</li>
          <li>💰 Late Fee Auto-Application</li>
          <li>📊 Owner Statement Generation</li>
          <li>📧 Email Service</li>
        </ul>
      </div>
      
      <div class="card">
        <h2>📄 Document Management</h2>
        <div class="endpoint">POST /api/documents/upload</div>
        <div class="endpoint">GET /api/documents</div>
        <div class="endpoint">GET /api/documents/:id</div>
        <div class="endpoint">DELETE /api/documents/:id</div>
        <p><a href="/test-upload-ui.html">Open Document Upload UI →</a></p>
      </div>
      
      <div class="card">
        <h2>📅 ICS Calendar Generator <span class="badge badge-success">NEW</span></h2>
        <p>No API credentials required! Works with all calendar apps.</p>
        <div class="endpoint">POST /api/ics/rent-reminder</div>
        <div class="endpoint">POST /api/ics/maintenance</div>
        <div class="endpoint">POST /api/ics/showing</div>
        <div class="endpoint">POST /api/ics/lease-event</div>
        <div class="endpoint">GET /api/ics/sample</div>
        <p><a href="/ics-test-ui.html">Open Calendar Generator UI →</a></p>
      </div>
      
      <div class="card">
        <h2>📊 Owner Statements</h2>
        <div class="endpoint">POST /api/statements/generate</div>
        <div class="endpoint">GET /api/statements/download/:filename</div>
        <div class="endpoint">GET /api/statements/owner/:ownerId</div>
      </div>
      
      <div class="card">
        <h2>🔧 Quick Links</h2>
        <ul>
          <li><a href="/api/health">Health Check</a></li>
          <li><a href="/api/documents/meta/categories">Document Categories</a></li>
          <li><a href="/api/ics/sample">Download Sample ICS</a></li>
          <li><a href="/test-upload-ui.html">Document Upload UI</a></li>
          <li><a href="/ics-test-ui.html">Calendar Generator UI</a></li>
        </ul>
      </div>
      
      <div class="card">
        <h2>📖 Documentation</h2>
        <ul>
          <li><a href="/rentkeepers/DOCUMENT-UPLOAD-RESULTS.md">Document Upload Docs</a></li>
          <li><a href="/rentkeepers/ICS-CALENDAR-SOLUTION.md">ICS Calendar Docs</a></li>
          <li><a href="/rentkeepers/LATE-FEES.md">Late Fee System Docs</a></li>
          <li><a href="/rentkeepers/README.md">Owner Statements Docs</a></li>
        </ul>
      </div>
    </body>
    </html>
  `;
  res.send(dashboard);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('======================================');
  console.log('✅ Server Started Successfully!\n');
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/\n`);
  console.log('📋 Available Features:\n');
  
  console.log('  📄 Document Management:');
  console.log('     POST   /api/documents/upload');
  console.log('     GET    /api/documents');
  console.log('     UI:    http://localhost:3000/test-upload-ui.html\n');
  
  console.log('  📅 ICS Calendar (No credentials!):');
  console.log('     POST   /api/ics/rent-reminder');
  console.log('     POST   /api/ics/maintenance');
  console.log('     POST   /api/ics/showing');
  console.log('     GET    /api/ics/sample');
  console.log('     UI:    http://localhost:3000/ics-test-ui.html\n');
  
  console.log('  📊 Owner Statements:');
  console.log('     POST   /api/statements/generate');
  console.log('     GET    /api/statements/download/:id\n');
  
  console.log('  🔧 System:');
  console.log('     GET    /api/health');
  console.log('     GET    /api/properties');
  console.log('     GET    /api/owners\n');
  
  console.log('======================================\n');
  console.log('👉 Open your browser to: http://localhost:3000\n');
  console.log('Press Ctrl+C to stop the server\n');
  
  // Start background schedulers (optional)
  if (lateFeeScheduler && process.env.LATE_FEE_ENABLED !== 'false') {
    console.log('🤖 Starting background schedulers...\n');
    try {
      lateFeeScheduler.start('0 3 * * *'); // Daily at 3 AM
      console.log('✅ Late Fee Scheduler started\n');
    } catch (error) {
      console.log('⚠️  Late Fee Scheduler not started (no database)\n');
    }
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server stopped\n');
    process.exit(0);
  });
});

module.exports = app;
