const cron = require('node-cron');
const mongoose = require('mongoose');

/**
 * Late Fee Auto-Application Service
 * Automatically applies late fees to overdue rent payments
 */
class LateFeeScheduler {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Start the scheduler
   * @param {string} schedule - Cron expression (default: daily at 3 AM)
   */
  start(schedule = '0 3 * * *') {
    console.log('Starting late fee scheduler...');
    
    cron.schedule(schedule, async () => {
      await this.processLateFees();
    }, {
      timezone: 'America/New_York'
    });

    console.log(`Late fee scheduler configured: ${schedule} (America/New_York)`);
  }

  /**
   * Main processing function - runs daily
   */
  async processLateFees() {
    if (this.isRunning) {
      console.log('Late fee processing already in progress');
      return;
    }

    this.isRunning = true;
    const now = new Date();
    
    console.log(`[${now.toISOString()}] Starting late fee processing...`);

    try {
      // Get all properties with active leases
      const properties = await Property.find({ status: 'active' }).populate('units');
      
      let totalLateFeesApplied = 0;
      let unitsProcessed = 0;
      let lateFeesApplied = [];

      for (const property of properties) {
        for (const unit of property.units || []) {
          const result = await this.checkUnitForLateFee(unit, property, now);
          
          if (result.lateFeeApplied) {
            totalLateFeesApplied += result.amount;
            lateFeesApplied.push(result);
          }
          unitsProcessed++;
        }
      }

      console.log(`Late fee processing complete:`);
      console.log(`  - Units checked: ${unitsProcessed}`);
      console.log(`  - Late fees applied: ${lateFeesApplied.length}`);
      console.log(`  - Total amount: $${totalLateFeesApplied.toFixed(2)}`);

      // Send summary to admins if any late fees were applied
      if (lateFeesApplied.length > 0) {
        await this.sendSummaryReport(lateFeesApplied, totalLateFeesApplied);
      }

    } catch (error) {
      console.error('Error in late fee processing:', error);
      await this.notifyAdmins('error', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check if a unit should have a late fee applied
   */
  async checkUnitForLateFee(unit, property, currentDate) {
    const lease = await Lease.findOne({
      unitId: unit._id,
      status: 'active',
      endDate: { $gte: currentDate }
    });

    if (!lease) {
      return { lateFeeApplied: false, reason: 'No active lease' };
    }

    // Check if rent is due today or earlier and not paid
    const rentDueDate = this.getRentDueDate(lease, currentDate);
    const gracePeriodEnd = new Date(rentDueDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + (property.gracePeriodDays || 5));

    // Only apply if past grace period and no payment received
    if (currentDate > gracePeriodEnd) {
      const payment = await Payment.findOne({
        leaseId: lease._id,
        type: 'rent',
        paymentDate: { $gte: rentDueDate },
        status: 'completed'
      });

      if (!payment) {
        // Check if late fee already applied for this period
        const existingLateFee = await Transaction.findOne({
          unitId: unit._id,
          type: 'income',
          category: 'Late Fee',
          date: { $gte: rentDueDate }
        });

        if (!existingLateFee) {
          const lateFeeAmount = this.calculateLateFee(lease, property);
          
          await this.applyLateFee({
            unit,
            property,
            lease,
            amount: lateFeeAmount,
            dueDate: rentDueDate,
            gracePeriodEnd
          });

          return {
            lateFeeApplied: true,
            amount: lateFeeAmount,
            unit: unit.name || unit.number,
            property: property.name,
            tenant: lease.tenantName
          };
        }
      }
    }

    return { lateFeeApplied: false, reason: 'Within grace period or already paid' };
  }

  /**
   * Get rent due date for current month
   */
  getRentDueDate(lease, currentDate) {
    const dueDay = lease.rentDueDay || 1; // Default to 1st of month
    const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dueDay);
    
    // If due date already passed this month, use next month
    if (dueDate > currentDate) {
      dueDate.setMonth(dueDate.getMonth() - 1);
    }
    
    return dueDate;
  }

  /**
   * Calculate late fee amount
   */
  calculateLateFee(lease, property) {
    const rentAmount = lease.monthlyRent;
    
    // Use property-specific late fee or default
    if (property.lateFeeType === 'percentage') {
      return rentAmount * (property.lateFeePercentage || 5) / 100;
    } else if (property.lateFeeType === 'flat') {
      return property.lateFeeFlatAmount || 50;
    } else if (property.lateFeeType === 'daily') {
      // Calculate days late
      const dueDate = this.getRentDueDate(lease, new Date());
      const gracePeriodEnd = new Date(dueDate);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + (property.gracePeriodDays || 5));
      const daysLate = Math.floor((new Date() - gracePeriodEnd) / (1000 * 60 * 60 * 24));
      return daysLate * (property.lateFeeDailyAmount || 10);
    }
    
    // Default: 5% or $50, whichever is greater
    return Math.max(rentAmount * 0.05, 50);
  }

  /**
   * Apply late fee to tenant account
   */
  async applyLateFee({ unit, property, lease, amount, dueDate, gracePeriodEnd }) {
    const transaction = await Transaction.create({
      propertyId: property._id,
      unitId: unit._id,
      leaseId: lease._id,
      type: 'income',
      category: 'Late Fee',
      description: `Late fee for rent due ${dueDate.toLocaleDateString()} (grace period ended ${gracePeriodEnd.toLocaleDateString()})`,
      amount: amount,
      date: new Date(),
      status: 'completed',
      metadata: {
        autoApplied: true,
        originalDueDate: dueDate,
        gracePeriodDays: property.gracePeriodDays || 5,
        rentAmount: lease.monthlyRent
      }
    });

    console.log(`Applied $${amount.toFixed(2)} late fee to ${unit.name || unit.number} (${lease.tenantName})`);
    
    // Send notification to tenant
    if (lease.tenantEmail) {
      await this.sendLateFeeNotice({
        tenantName: lease.tenantName,
        tenantEmail: lease.tenantEmail,
        unitName: unit.name || unit.number,
        propertyName: property.name,
        lateFeeAmount: amount,
        originalDueDate: dueDate,
        gracePeriodEnd
      });
    }

    return transaction;
  }

  /**
   * Send late fee notice to tenant
   */
  async sendLateFeeNotice({ tenantName, tenantEmail, unitName, propertyName, lateFeeAmount, originalDueDate, gracePeriodEnd }) {
    const emailService = require('./email-service');
    
    await emailService.send({
      to: tenantEmail,
      subject: `Late Fee Applied - ${propertyName}, Unit ${unitName}`,
      text: `
Dear ${tenantName},

A late fee of $${lateFeeAmount.toFixed(2)} has been applied to your account for ${propertyName}, Unit ${unitName}.

Original Rent Due Date: ${originalDueDate.toLocaleDateString()}
Grace Period Ended: ${gracePeriodEnd.toLocaleDateString()}
Late Fee Amount: $${lateFeeAmount.toFixed(2)}

Please submit your payment as soon as possible to avoid additional fees.

If you believe this is an error, please contact your property manager.

Thank you,
Property Management
      `.trim(),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Late Fee Notice</h2>
          
          <p>Dear ${tenantName},</p>
          
          <p>A late fee has been applied to your account for <strong>${propertyName}, Unit ${unitName}</strong>.</p>
          
          <div style="background-color: #fef2f2; border: 1px solid #fca5a5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 5px 0;"><strong>Original Rent Due Date:</strong></td>
                <td style="padding: 5px 0; text-align: right;">${originalDueDate.toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;"><strong>Grace Period Ended:</strong></td>
                <td style="padding: 5px 0; text-align: right;">${gracePeriodEnd.toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;"><strong>Late Fee Amount:</strong></td>
                <td style="padding: 5px 0; text-align: right; color: #dc2626; font-weight: bold;">$${lateFeeAmount.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          <p>Please submit your payment as soon as possible to avoid additional fees.</p>
          
          <p style="margin-top: 20px;">If you believe this is an error, please contact your property manager.</p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin-top: 30px;" />
          <p style="color: #666; font-size: 12px;">This is an automated notice from your property management system.</p>
        </div>
      `
    });

    console.log(`Late fee notice sent to ${tenantEmail}`);
  }

  /**
   * Send daily summary to admins
   */
  async sendSummaryReport(lateFeesApplied, totalAmount) {
    const emailService = require('./email-service');
    
    if (!process.env.ADMIN_EMAIL) {
      return;
    }

    const itemList = lateFeesApplied.map(item => 
      `<tr>
        <td style="padding: 8px;">${item.property}</td>
        <td style="padding: 8px;">${item.unit}</td>
        <td style="padding: 8px;">${item.tenant}</td>
        <td style="padding: 8px; text-align: right;">$${item.amount.toFixed(2)}</td>
      </tr>`
    ).join('');

    await emailService.send({
      to: process.env.ADMIN_EMAIL,
      subject: `Late Fee Processing Summary - ${new Date().toLocaleDateString()}`,
      text: `
Late Fee Processing Summary
Date: ${new Date().toLocaleDateString()}

Total Late Fees Applied: ${lateFeesApplied.length}
Total Amount: $${totalAmount.toFixed(2)}

Details:
${lateFeesApplied.map(item => `- ${item.property}, Unit ${item.unit} (${item.tenant}): $${item.amount.toFixed(2)}`).join('\n')}
      `.trim(),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px;">
          <h2 style="color: #1a1a2e;">Late Fee Processing Summary</h2>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          
          <div style="background-color: #f0f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Total Late Fees Applied:</strong> ${lateFeesApplied.length}</p>
            <p style="margin: 5px 0;"><strong>Total Amount:</strong> <span style="color: #16a34a; font-weight: bold;">$${totalAmount.toFixed(2)}</span></p>
          </div>
          
          <h3>Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #1a1a2e; color: white;">
                <th style="padding: 10px; text-align: left;">Property</th>
                <th style="padding: 10px; text-align: left;">Unit</th>
                <th style="padding: 10px; text-align: left;">Tenant</th>
                <th style="padding: 10px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemList}
            </tbody>
          </table>
        </div>
      `
    });
  }

  /**
   * Notify admins of errors
   */
  async notifyAdmins(type, message) {
    if (!process.env.ADMIN_EMAIL) {
      return;
    }

    const emailService = require('./email-service');
    
    await emailService.send({
      to: process.env.ADMIN_EMAIL,
      subject: `Late Fee Processing ${type === 'error' ? 'Failed' : 'Complete'}`,
      text: `Status: ${type}\n\n${message}`
    });
  }
}

module.exports = new LateFeeScheduler();
