const express = require('express');
const router = express.Router();
const OwnerStatementGenerator = require('./owner-statements');

const generator = new OwnerStatementGenerator();

/**
 * POST /api/statements/generate
 * Generate a new owner statement PDF
 */
router.post('/generate', async (req, res) => {
  try {
    const { ownerId, propertyId, month, year } = req.body;

    // Validate required fields
    if (!ownerId || !propertyId || !month || !year) {
      return res.status(400).json({
        error: 'Missing required fields: ownerId, propertyId, month, year'
      });
    }

    // Fetch data from database
    const statementData = await fetchStatementData({
      ownerId,
      propertyId,
      month,
      year,
      companyId: req.user.companyId // From auth middleware
    });

    // Generate PDF
    const pdfPath = await generator.generateStatement(statementData);

    // Return download URL
    res.json({
      success: true,
      statement: {
        id: `${propertyId}-${year}-${month}`,
        downloadUrl: `/api/statements/download/${path.basename(pdfPath)}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });
  } catch (error) {
    console.error('Error generating statement:', error);
    res.status(500).json({ error: 'Failed to generate statement' });
  }
});

/**
 * GET /api/statements/download/:filename
 * Download a generated statement
 */
router.get('/download/:filename', (req, res) => {
  const filePath = path.join(generator.tempDir, req.params.filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Statement not found or expired' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
  fs.createReadStream(filePath).pipe(res);
});

/**
 * GET /api/statements/owner/:ownerId
 * List all statements for an owner
 */
router.get('/owner/:ownerId', async (req, res) => {
  try {
    const { ownerId } = req.params;
    const { propertyId, year } = req.query;

    const statements = await StatementModel.find({
      ownerId,
      ...(propertyId && { propertyId }),
      ...(year && { year: parseInt(year) })
    }).sort({ year: -1, month: -1 });

    res.json({
      statements: statements.map(s => ({
        id: s._id,
        property: s.propertyName,
        month: s.month,
        year: s.year,
        netToOwner: s.netToOwner,
        status: s.status,
        generatedAt: s.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching statements:', error);
    res.status(500).json({ error: 'Failed to fetch statements' });
  }
});

/**
 * POST /api/statements/schedule
 * Schedule automatic monthly statements
 */
router.post('/schedule', async (req, res) => {
  try {
    const { ownerId, propertyId, options } = req.body;

    await StatementSchedule.create({
      ownerId,
      propertyId,
      companyId: req.user.companyId,
      autoEmail: options.autoEmail || false,
      emailRecipients: options.emailRecipients || [],
      dayOfMonth: options.dayOfMonth || 5, // Default to 5th
      createdBy: req.user.id
    });

    res.json({ success: true, message: 'Auto-statements scheduled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to schedule statements' });
  }
});

// Helper function to fetch statement data from database
async function fetchStatementData({ ownerId, propertyId, month, year, companyId }) {
  // Fetch from your database models
  const company = await Company.findById(companyId);
  const owner = await Owner.findById(ownerId);
  const property = await Property.findById(propertyId);
  
  // Get transactions for the period
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const transactions = await Transaction.find({
    propertyId,
    date: { $gte: startDate, $lte: endDate },
    status: 'completed'
  }).sort({ date: 1 });

  // Calculate summary
  const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const managementFee = income * (property.managementFeePercent / 100);

  return {
    company,
    owner,
    property,
    statementPeriod: { month, year },
    transactions: transactions.map(t => ({
      date: t.date,
      description: t.description,
      category: t.category,
      type: t.type,
      amount: t.amount
    })),
    summary: {
      totalIncome: income,
      totalExpenses: expenses,
      managementFee,
      netToOwner: income - expenses - managementFee
    }
  };
}

module.exports = router;
