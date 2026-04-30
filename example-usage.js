// Example usage of Owner Statement Generator
const OwnerStatementGenerator = require('./owner-statements');

async function generateSampleStatement() {
  const generator = new OwnerStatementGenerator();

  // Sample data for a 50+ unit property management company
  const statementData = {
    company: {
      name: 'Metro Property Management',
      address: '123 Business Plaza, Suite 500',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      phone: '(512) 555-0100',
      email: 'statements@metropm.com'
    },
    owner: {
      name: 'Robert Johnson',
      address: '456 Oakwood Drive',
      city: 'Houston',
      state: 'TX',
      zip: '77001',
      email: 'rjohnson@email.com'
    },
    property: {
      id: 'PROP-7829',
      name: 'Lakeside Apartments',
      address: '789 Lakeview Boulevard',
      city: 'Austin',
      state: 'TX',
      zip: '78745',
      unitCount: 64
    },
    statementPeriod: {
      month: 3,
      year: 2025
    },
    transactions: [
      { date: '2025-03-01', description: 'Unit 101 - March Rent', category: 'Rent', type: 'income', amount: 1450.00 },
      { date: '2025-03-01', description: 'Unit 102 - March Rent', category: 'Rent', type: 'income', amount: 1450.00 },
      { date: '2025-03-01', description: 'Unit 103 - March Rent', category: 'Rent', type: 'income', amount: 1500.00 },
      { date: '2025-03-05', description: 'Unit 104 - March Rent', category: 'Rent', type: 'income', amount: 1450.00 },
      { date: '2025-03-08', description: 'Unit 105 - March Rent (Late)', category: 'Rent', type: 'income', amount: 1475.00 },
      { date: '2025-03-10', description: 'Unit 106 - March Rent', category: 'Rent', type: 'income', amount: 1600.00 },
      { date: '2025-03-12', description: 'Unit 107 - March Rent', category: 'Rent', type: 'income', amount: 1450.00 },
      { date: '2025-03-15', description: 'Unit 108 - March Rent', category: 'Rent', type: 'income', amount: 1450.00 },
      { date: '2025-03-15', description: 'Unit 109 - March Rent', category: 'Rent', type: 'income', amount: 1550.00 },
      { date: '2025-03-18', description: 'Unit 110 - March Rent', category: 'Rent', type: 'income', amount: 1450.00 },
      { date: '2025-03-02', description: 'Plumbing Repair - Unit 103', category: 'Maintenance', type: 'expense', amount: 245.00 },
      { date: '2025-03-04', description: 'HVAC Service - Multiple Units', category: 'Maintenance', type: 'expense', amount: 485.00 },
      { date: '2025-03-08', description: 'Carpet Cleaning - Unit 105', category: 'Maintenance', type: 'expense', amount: 180.00 },
      { date: '2025-03-12', description: 'Appliance Repair - Unit 108', category: 'Maintenance', type: 'expense', amount: 320.00 },
      { date: '2025-03-15', description: 'Landscaping Service', category: 'Maintenance', type: 'expense', amount: 450.00 },
      { date: '2025-03-18', description: 'Electrical Work - Unit 102', category: 'Maintenance', type: 'expense', amount: 275.00 },
      { date: '2025-03-20', description: 'Property Insurance', category: 'Insurance', type: 'expense', amount: 890.00 },
      { date: '2025-03-22', description: 'Property Taxes (Monthly)', category: 'Taxes', type: 'expense', amount: 1200.00 },
      { date: '2025-03-25', description: 'Common Area Cleaning', category: 'Maintenance', type: 'expense', amount: 350.00 }
    ],
    summary: {
      totalIncome: 14175.00,
      totalExpenses: 4595.00,
      managementFee: 1417.50, // 10% of income
      netToOwner: 8162.50
    }
  };

  try {
    const pdfPath = await generator.generateStatement(statementData);
    console.log('Statement generated:', pdfPath);
    return pdfPath;
  } catch (error) {
    console.error('Error generating statement:', error);
    throw error;
  }
}

// Run the example
generateSampleStatement();

module.exports = generateSampleStatement;
