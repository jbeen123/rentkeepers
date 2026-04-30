/**
 * Test Server for Document Upload UI
 * Standalone server for testing the document upload functionality
 * 
 * Usage: node test-server.js
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

console.log('\n🚀 Starting RentKeepers Test Server\n');

// Check if express is installed
try {
  require('express');
  console.log('✅ Express installed');
} catch (error) {
  console.log('❌ Express not installed. Run: npm install express\n');
  process.exit(1);
}

// Check if multer is installed
try {
  require('multer');
  console.log('✅ Multer installed');
} catch (error) {
  console.log('❌ Multer not installed. Run: npm install multer\n');
  process.exit(1);
}

const app = express();
const PORT = process.env.TEST_PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));

// Document upload routes
const documentRoutes = require('./document-routes');
app.use('/api/documents', documentRoutes);

// ICS Calendar routes
const icsRoutes = require('./ics-calendar-routes');
app.use('/api/ics', icsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'RentKeepers Document Upload Test Server'
  });
});

// Serve the test UI at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-upload-ui.html'));
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
  console.log('\n======================================');
  console.log('✅ Server Started Successfully!\n');
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`📄 Test UI: http://localhost:${PORT}/test-upload-ui.html`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health\n`);
  console.log('📋 API Endpoints:');
  console.log('   POST   /api/documents/upload');
  console.log('   POST   /api/documents/upload-multiple');
  console.log('   GET    /api/documents');
  console.log('   GET    /api/documents/:id');
  console.log('   GET    /api/documents/download/:id');
  console.log('   GET    /api/documents/view/:id');
  console.log('   DELETE /api/documents/:id');
  console.log('   GET    /api/documents/meta/categories\n');
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
