const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

// File filter - only allow certain file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: PDF, JPG, PNG, DOC, DOCX`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

// In-memory document store (replace with database in production)
const documents = [];

/**
 * POST /api/documents/upload
 * Upload a document
 */
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const document = {
      id: documents.length + 1,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadedAt: new Date(),
      // Metadata from form
      title: req.body.title || req.file.originalname,
      description: req.body.description || '',
      category: req.body.category || 'general',
      propertyId: req.body.propertyId || null,
      unitId: req.body.unitId || null,
      tenantId: req.body.tenantId || null,
      ownerId: req.body.ownerId || null
    };

    documents.push(document);

    console.log(`📄 Document uploaded: ${document.originalName} (${(document.size / 1024).toFixed(2)} KB)`);

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        filename: document.originalName,
        size: document.size,
        uploadedAt: document.uploadedAt,
        downloadUrl: `/api/documents/download/${document.id}`,
        viewUrl: `/api/documents/view/${document.id}`
      }
    });
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/documents/upload-multiple
 * Upload multiple documents at once
 */
router.post('/upload-multiple', upload.array('documents', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedDocs = req.files.map(file => {
      const document = {
        id: documents.length + 1,
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        uploadedAt: new Date(),
        category: req.body.category || 'general',
        propertyId: req.body.propertyId || null
      };

      documents.push(document);
      return document;
    });

    console.log(`📄 ${uploadedDocs.length} documents uploaded`);

    res.json({
      success: true,
      message: `${uploadedDocs.length} document(s) uploaded successfully`,
      documents: uploadedDocs.map(doc => ({
        id: doc.id,
        filename: doc.originalName,
        size: doc.size,
        downloadUrl: `/api/documents/download/${doc.id}`
      }))
    });
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/documents
 * List all documents (with optional filters)
 */
router.get('/', async (req, res) => {
  try {
    const { category, propertyId, ownerId, search } = req.query;

    let filteredDocs = documents;

    // Apply filters
    if (category) {
      filteredDocs = filteredDocs.filter(d => d.category === category);
    }
    if (propertyId) {
      filteredDocs = filteredDocs.filter(d => d.propertyId === propertyId);
    }
    if (ownerId) {
      filteredDocs = filteredDocs.filter(d => d.ownerId === ownerId);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filteredDocs = filteredDocs.filter(d => 
        d.title.toLowerCase().includes(searchLower) ||
        d.originalName.toLowerCase().includes(searchLower) ||
        d.description.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      documents: filteredDocs.map(doc => ({
        id: doc.id,
        title: doc.title,
        filename: doc.originalName,
        category: doc.category,
        size: doc.size,
        uploadedAt: doc.uploadedAt,
        downloadUrl: `/api/documents/download/${doc.id}`
      })),
      total: filteredDocs.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/documents/:id
 * Get document metadata
 */
router.get('/:id', async (req, res) => {
  try {
    const doc = documents.find(d => d.id === parseInt(req.params.id));
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      document: {
        id: doc.id,
        title: doc.title,
        filename: doc.originalName,
        description: doc.description,
        category: doc.category,
        mimetype: doc.mimetype,
        size: doc.size,
        uploadedAt: doc.uploadedAt,
        downloadUrl: `/api/documents/download/${doc.id}`,
        viewUrl: `/api/documents/view/${doc.id}`
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/documents/download/:id
 * Download a document
 */
router.get('/download/:id', async (req, res) => {
  try {
    const doc = documents.find(d => d.id === parseInt(req.params.id));
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!fs.existsSync(doc.path)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.setHeader('Content-Type', doc.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.originalName}"`);
    fs.createReadStream(doc.path).pipe(res);

    console.log(`⬇️ Document downloaded: ${doc.originalName}`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/documents/view/:id
 * View a document in browser (for PDFs and images)
 */
router.get('/view/:id', async (req, res) => {
  try {
    const doc = documents.find(d => d.id === parseInt(req.params.id));
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!fs.existsSync(doc.path)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Set inline disposition for viewing
    res.setHeader('Content-Type', doc.mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`);
    fs.createReadStream(doc.path).pipe(res);

    console.log(`👁️ Document viewed: ${doc.originalName}`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete a document
 */
router.delete('/:id', async (req, res) => {
  try {
    const docIndex = documents.findIndex(d => d.id === parseInt(req.params.id));
    
    if (docIndex === -1) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = documents[docIndex];

    // Delete file from disk
    if (fs.existsSync(doc.path)) {
      fs.unlinkSync(doc.path);
    }

    // Remove from array
    documents.splice(docIndex, 1);

    console.log(`🗑️ Document deleted: ${doc.originalName}`);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/documents/categories
 * List available document categories
 */
router.get('/meta/categories', async (req, res) => {
  const categories = [
    { id: 'lease', name: 'Lease Agreements', icon: '📋' },
    { id: 'inspection', name: 'Inspection Reports', icon: '🔍' },
    { id: 'maintenance', name: 'Maintenance Records', icon: '🔧' },
    { id: 'payment', name: 'Payment Records', icon: '💰' },
    { id: 'correspondence', name: 'Correspondence', icon: '📧' },
    { id: 'legal', name: 'Legal Documents', icon: '⚖️' },
    { id: 'insurance', name: 'Insurance', icon: '🛡️' },
    { id: 'general', name: 'General', icon: '📁' }
  ];

  res.json({ categories });
});

module.exports = router;
