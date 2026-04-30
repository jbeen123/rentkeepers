/**
 * Main Server with Document Upload Integration
 * Example server showing how to integrate document routes
 * 
 * Usage: node server-with-documents.js
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

console.log('\n🏢 RentKeepers Main Server\n');

// Import routes
const documentRoutes = require('./document-routes');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/documents', documentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'RentKeepers API',
    version: '1.0.0'
  });
});

// Example: Property routes (placeholder)
app.get('/api/properties', (req, res) => {
  res.json({
    properties: [
      { id: 1, name: 'Sunset Apartments', units: 64 },
      { id: 2, name: 'Oak Gardens', units: 32 }
    ]
  });
});

// Example: Owner routes (placeholder)
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
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .card { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .endpoint { background: #e0e0e0; padding: 10px; margin: 5px 0; border-radius: 4px; font-family: monospace; }
        h1 { color: #1a1a2e; }
        a { color: #667eea; }
      </style>
    </head>
    <body>
      <h1>🏠 RentKeepers API Server</h1>
      
      <div class="card">
        <h2>✅ Server Status</h2>
        <p>Server is running on port ${PORT}</p>
      </div>
      
      <div class="card">
        <h2>📄 Document Upload System</h2>
        <p>Full document upload functionality is available:</p>
        <div class="endpoint">POST /api/documents/upload</div>
        <div class="endpoint">GET /api/documents</div>
        <div class="endpoint">GET /api/documents/:id</div>
        <div class="endpoint">DELETE /api/documents/:id</div>
        <p><a href="/test-upload-ui.html">Open Test UI →</a></p>
      </div>
      
      <div class="card">
        <h2>🏢 Property Management</h2>
        <div class="endpoint">GET /api/properties</div>
        <div class="endpoint">GET /api/owners</div>
      </div>
      
      <div class="card">
        <h2>🔧 Quick Links</h2>
        <ul>
          <li><a href="/api/health">Health Check</a></li>
          <li><a href="/api/documents/meta/categories">Document Categories</a></li>
          <li><a href="/test-upload-ui.html">Document Upload UI</a></li>
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
  console.log(`📊 Dashboard: http://localhost:${PORT}/`);
  console.log(`📄 Test UI: http://localhost:${PORT}/test-upload-ui.html`);
  console.log(`🏥 Health: http://localhost:${PORT}/api/health\n`);
  console.log('📋 Available Endpoints:\n');
  console.log('  Document Upload:');
  console.log('    POST   /api/documents/upload');
  console.log('    POST   /api/documents/upload-multiple');
  console.log('    GET    /api/documents');
  console.log('    GET    /api/documents/:id');
  console.log('    GET    /api/documents/download/:id');
  console.log('    GET    /api/documents/view/:id');
  console.log('    DELETE /api/documents/:id\n');
  console.log('  Property Management:');
  console.log('    GET    /api/properties');
  console.log('    GET    /api/owners\n');
  console.log('======================================\n');
  console.log('👉 Open your browser to: http://localhost:3000\n');
  console.log('Press Ctrl+C to stop the server\n');
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
