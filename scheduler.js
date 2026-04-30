const cron = require('node-cron');
const OwnerStatementGenerator = require('./owner-statements');
const Statement = require('./models/statement');
const emailService = require('./email-service');

/**
 * Scheduled Statement Generation
 * Runs on the configured day of each month
 */
class StatementScheduler {
  constructor() {
    this.generator = new OwnerStatementGenerator();
    this.isRunning = false;
  }

  /**
   * Start the scheduler
   * Default: Run on the 5th of each month at 2 AM
   */
  start(schedule = '0 2 5 * *') {
    console.log('Starting statement scheduler...');
    
    cron.schedule(schedule, async () => {
      await this.generateMonthlyStatements();
    }, {
      timezone: 'America/New_York'
    });

    console.log(`Statement scheduler configured: ${schedule}`);
  }

  /**
   * Generate statements for all scheduled owners
   */
  async generateMonthlyStatements() {
    if (this.isRunning) {
      console.log('Statement generation already in progress');
      return;
    }

    this.isRunning = true;
    const now = new Date();
    const month = now.getMonth() === 0 ? 12 : now.getMonth(); // Previous month
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    console.log(`Generating statements for ${month}/${year}...`);

    try {
      // Get all active properties with auto-statements enabled
      const schedules = await StatementSchedule.find({
        autoEmail: true,
        active: true
      }).populate('ownerId propertyId companyId');

      console.log(`Found ${schedules.length} scheduled statements to generate`);

      for (const schedule of schedules) {
        await this.processSchedule(schedule, month, year);
      }

      console.log('Monthly statement generation complete');
    } catch (error) {
      console.error('Error in statement generation:', error);
      // Send alert to admins
      await this.notifyAdmins('error', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process a single schedule
   */
  async processSchedule(schedule, month, year) {
    try {
      // Check if statement already exists
      const existing = await Statement.findOne({
        ownerId: schedule.ownerId._id,
        propertyId: schedule.propertyId._id,
        month,
        year
      });

      if (existing && existing.status !== 'generating') {
        console.log(`Statement already exists for ${schedule.ownerId.name}`);
        return;
      }

      // Create or update statement record
      const statement = existing || await Statement.create({
        ownerId: schedule.ownerId._id,
        propertyId: schedule.propertyId._id,
        companyId: schedule.companyId._id,
        month,
        year,
        status: 'generating'
      });

      // Fetch transaction data
      const data = await this.fetchStatementData({
        owner: schedule.ownerId,
        property: schedule.propertyId,
        company: schedule.companyId,
        month,
        year
      });

      // Generate PDF
      const pdfPath = await this.generator.generateStatement(data);
      
      // Update statement record
      statement.status = 'ready';
      statement.file = {
        filename: path.basename(pdfPath),
        path: pdfPath,
        size: fs.statSync(pdfPath).size,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      };
      statement.summary = data.summary;
      statement.transactionCount = data.transactions.length;
      await statement.save();

      // Auto-email if enabled
      if (schedule.autoEmail && schedule.emailRecipients.length > 0) {
        await this.emailStatement(statement, schedule.emailRecipients);
      }

      console.log(`Generated statement for ${schedule.ownerId.name}`);
    } catch (error) {
      console.error(`Failed to generate statement for ${schedule.ownerId?.name}:`, error);
      // Update statement with error status
      await Statement.updateOne(
        { ownerId: schedule.ownerId._id, propertyId: schedule.propertyId._id, month, year },
        { status: 'error', error: error.message }
      );
    }
  }

  /**
   * Email statement to recipients
   */
  async emailStatement(statement, recipients) {
    try {
      await emailService.sendOwnerStatement({
        to: recipients,
        ownerName: statement.ownerId.name,
        propertyName: statement.propertyName,
        period: statement.period,
        netToOwner: statement.summary.netToOwner,
        pdfPath: statement.file.path,
        pdfFilename: statement.file.filename,
        downloadLink: `${process.env.APP_URL}/statements/${statement._id}`
      });
      await statement.markAsSent(recipients);
      console.log(`Statement emailed to ${Array.isArray(recipients) ? recipients.join(', ') : recipients}`);
    } catch (error) {
      console.error('Failed to email statement:', error.message);
      throw error;
    }
  }

  /**
   * Fetch all data needed for statement generation
   */
  async fetchStatementData({ owner, property, company, month, year }) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const transactions = await Transaction.find({
      propertyId: property._id,
      date: { $gte: startDate, $lte: endDate },
      status: 'completed'
    }).sort({ date: 1 });

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const managementFee = income * (property.managementFeePercent || 10) / 100;

    return {
      company: {
        name: company.name,
        address: company.address,
        city: company.city,
        state: company.state,
        zip: company.zip,
        phone: company.phone,
        email: company.email
      },
      owner: {
        name: owner.name,
        address: owner.address,
        city: owner.city,
        state: owner.state,
        zip: owner.zip,
        email: owner.email
      },
      property: {
        id: property._id.toString(),
        name: property.name,
        address: property.address.street || property.address,
        city: property.address.city || '',
        state: property.address.state || '',
        zip: property.address.zip || '',
        unitCount: property.unitCount
      },
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

  /**
   * Notify admins of errors
   */
  async notifyAdmins(type, message) {
    if (!process.env.ADMIN_EMAIL) {
      console.warn('ADMIN_EMAIL not configured, skipping admin notification');
      return;
    }

    try {
      await emailService.send({
        to: process.env.ADMIN_EMAIL,
        subject: `Statement Generation ${type === 'error' ? 'Failed' : 'Complete'}`,
        text: `Statement generation status: ${type}\n\n${message}`,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2 style="color: ${type === 'error' ? '#dc2626' : '#16a34a'}">
              Statement Generation ${type === 'error' ? 'Failed' : 'Complete'}
            </h2>
            <p>${message}</p>
            <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toLocaleString()}</p>
          </div>
        `
      });
    } catch (error) {
      console.error('Failed to send admin notification:', error.message);
    }
  }
}

module.exports = new StatementScheduler();
