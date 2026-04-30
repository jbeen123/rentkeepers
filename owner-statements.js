const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class OwnerStatementGenerator {
  constructor() {
    this.tempDir = path.join(__dirname, 'temp', 'statements');
    this.ensureTempDir();
  }

  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Generate a professional owner statement PDF
   * @param {Object} data - Statement data
   * @returns {Promise<string>} - Path to generated PDF
   */
  async generateStatement(data) {
    const {
      owner,
      property,
      statementPeriod,
      transactions,
      summary,
      company // Property management company info
    } = data;

    const filename = `owner-statement-${property.id}-${statementPeriod.year}-${String(statementPeriod.month).padStart(2, '0')}.pdf`;
    const filepath = path.join(this.tempDir, filename);

    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Header with company branding
    this.renderHeader(doc, company, statementPeriod);

    // Owner and Property Info
    this.renderOwnerPropertyInfo(doc, owner, property);

    // Summary Cards
    this.renderSummaryCards(doc, summary);

    // Transactions Table
    this.renderTransactionsTable(doc, transactions);

    // Footer with totals
    this.renderFooter(doc, summary);

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filepath));
      stream.on('error', reject);
    });
  }

  renderHeader(doc, company, period) {
    // Company Logo/Name
    doc.fontSize(24).font('Helvetica-Bold').text(company.name, 50, 50);
    doc.fontSize(10).font('Helvetica').text(company.address, 50, 80);
    doc.text(`${company.city}, ${company.state} ${company.zip}`);
    doc.text(`Phone: ${company.phone} | Email: ${company.email}`);

    // Statement Title
    doc.fontSize(18).font('Helvetica-Bold');
    doc.text('OWNER STATEMENT', 400, 50, { align: 'right' });
    
    const monthName = new Date(period.year, period.month - 1).toLocaleString('en-US', { month: 'long' });
    doc.fontSize(12).font('Helvetica');
    doc.text(`${monthName} ${period.year}`, 400, 75, { align: 'right' });

    // Horizontal line
    doc.moveTo(50, 120).lineTo(550, 120).stroke();
    doc.moveDown(2);
  }

  renderOwnerPropertyInfo(doc, owner, property) {
    const startY = doc.y;

    // Owner Info (Left)
    doc.fontSize(11).font('Helvetica-Bold').text('OWNER', 50, startY);
    doc.fontSize(10).font('Helvetica');
    doc.text(owner.name, 50, startY + 15);
    doc.text(owner.address);
    doc.text(`${owner.city}, ${owner.state} ${owner.zip}`);
    doc.text(owner.email);

    // Property Info (Right)
    doc.fontSize(11).font('Helvetica-Bold').text('PROPERTY', 300, startY);
    doc.fontSize(10).font('Helvetica');
    doc.text(property.name || property.address, 300, startY + 15);
    doc.text(property.address);
    doc.text(`${property.city}, ${property.state} ${property.zip}`);
    if (property.unitCount) {
      doc.text(`${property.unitCount} Units`);
    }

    doc.moveDown(2);
  }

  renderSummaryCards(doc, summary) {
    const startY = doc.y + 10;
    const cardWidth = 120;
    const cardHeight = 60;
    const gap = 10;

    const cards = [
      { label: 'Total Income', value: this.formatCurrency(summary.totalIncome), color: '#22c55e' },
      { label: 'Total Expenses', value: this.formatCurrency(summary.totalExpenses), color: '#ef4444' },
      { label: 'Management Fee', value: this.formatCurrency(summary.managementFee), color: '#3b82f6' },
      { label: 'Net to Owner', value: this.formatCurrency(summary.netToOwner), color: summary.netToOwner >= 0 ? '#22c55e' : '#ef4444' }
    ];

    cards.forEach((card, i) => {
      const x = 50 + (i * (cardWidth + gap));
      
      // Card background
      doc.rect(x, startY, cardWidth, cardHeight).stroke('#e5e7eb');
      
      // Label
      doc.fontSize(9).font('Helvetica').fillColor('#6b7280');
      doc.text(card.label, x + 8, startY + 8);
      
      // Value
      doc.fontSize(14).font('Helvetica-Bold').fillColor(card.color);
      doc.text(card.value, x + 8, startY + 28);
    });

    doc.moveDown(5);
  }

  renderTransactionsTable(doc, transactions) {
    const startY = doc.y;
    const colWidths = [80, 180, 80, 80, 80];
    const headers = ['Date', 'Description', 'Category', 'Income', 'Expense'];
    const rowHeight = 20;

    // Table Header
    doc.fillColor('#f3f4f6').rect(50, startY, 500, rowHeight).fill();
    doc.fillColor('#1f2937').fontSize(9).font('Helvetica-Bold');
    
    let x = 50;
    headers.forEach((header, i) => {
      doc.text(header, x + 5, startY + 6);
      x += colWidths[i];
    });

    // Table Rows
    let y = startY + rowHeight;
    let isEven = false;

    transactions.forEach((txn) => {
      // Alternate row colors
      if (isEven) {
        doc.fillColor('#f9fafb').rect(50, y, 500, rowHeight).fill();
      }

      doc.fillColor('#374151').fontSize(9).font('Helvetica');
      x = 50;
      
      // Date
      doc.text(this.formatDate(txn.date), x + 5, y + 5);
      x += colWidths[0];
      
      // Description
      doc.text(this.truncateText(txn.description, 35), x + 5, y + 5);
      x += colWidths[1];
      
      // Category
      doc.text(txn.category, x + 5, y + 5);
      x += colWidths[2];
      
      // Income
      if (txn.type === 'income') {
        doc.text(this.formatCurrency(txn.amount), x + 5, y + 5);
      }
      x += colWidths[3];
      
      // Expense
      if (txn.type === 'expense') {
        doc.text(this.formatCurrency(txn.amount), x + 5, y + 5);
      }

      y += rowHeight;
      isEven = !isEven;

      // New page if needed
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    });

    doc.moveDown(2);
  }

  renderFooter(doc, summary) {
    const y = doc.y + 10;

    // Divider
    doc.moveTo(50, y).lineTo(550, y).stroke();
    doc.moveDown(1);

    // Summary section
    doc.fontSize(10).font('Helvetica');
    
    const summaryY = doc.y;
    const labelX = 350;
    const valueX = 480;

    doc.text('Total Income:', labelX, summaryY);
    doc.text(this.formatCurrency(summary.totalIncome), valueX, summaryY, { align: 'right' });

    doc.text('Total Expenses:', labelX, summaryY + 18);
    doc.text(this.formatCurrency(summary.totalExpenses), valueX, summaryY + 18, { align: 'right' });

    doc.text('Management Fee:', labelX, summaryY + 36);
    doc.text(`(${this.formatCurrency(summary.managementFee)})`, valueX, summaryY + 36, { align: 'right' });

    // Net line with emphasis
    doc.moveTo(labelX, summaryY + 55).lineTo(550, summaryY + 55).stroke();
    
    doc.font('Helvetica-Bold');
    doc.text('NET TO OWNER:', labelX, summaryY + 62);
    doc.text(this.formatCurrency(summary.netToOwner), valueX, summaryY + 62, { align: 'right' });

    // Footer note
    doc.fontSize(9).font('Helvetica').fillColor('#6b7280');
    doc.text('This statement is for informational purposes only. Payment will be processed within 2-3 business days.', 50, 750);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 50, 765);
  }

  // Helper methods
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}

module.exports = OwnerStatementGenerator;
