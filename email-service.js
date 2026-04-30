const nodemailer = require('nodemailer');

/**
 * Email Service for RentKeepers
 * Handles sending owner statements and notifications
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  /**
   * Initialize the email transporter
   */
  initialize() {
    if (this.initialized) {
      return this.transporter;
    }

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      console.warn('Email service not configured: SMTP_USER or SMTP_PASS missing');
      console.warn('Set SMTP credentials in .env to enable email sending');
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('Email service verification failed:', error.message);
        this.initialized = false;
      } else {
        console.log('Email service ready: server connected successfully');
        this.initialized = true;
      }
    });

    return this.transporter;
  }

  /**
   * Send an email
   * @param {Object} options - Email options
   * @param {string|string[]} options.to - Recipient(s)
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Plain text body
   * @param {string} [options.html] - HTML body (optional)
   * @param {Array} [options.attachments] - Attachments (optional)
   */
  async send(options) {
    const transporter = this.initialize();
    
    if (!transporter) {
      const errorMsg = 'Email service not configured. Set SMTP credentials in .env';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'RentKeepers'}" <${process.env.SMTP_USER}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments || []
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send email:', error.message);
      throw error;
    }
  }

  /**
   * Send owner statement email
   * @param {Object} statementData - Statement data
   */
  async sendOwnerStatement(statementData) {
    const {
      to,
      ownerName,
      propertyName,
      period,
      netToOwner,
      pdfPath,
      pdfFilename,
      downloadLink
    } = statementData;

    const subject = `Monthly Owner Statement - ${period}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Your Monthly Owner Statement</h2>
        
        <p>Dear ${ownerName},</p>
        
        <p>Your owner statement for <strong>${propertyName}</strong> is ready for the period of <strong>${period}</strong>.</p>
        
        <div style="background-color: #f0f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1a1a2e; margin-top: 0;">Statement Summary</h3>
          <p style="font-size: 18px; color: #22c55e; margin: 10px 0;">
            <strong>Net to Owner: $${netToOwner.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
          </p>
          <p style="color: #666; font-size: 14px;">See attached PDF for detailed breakdown</p>
        </div>
        
        <p>The full statement is attached to this email as a PDF.</p>
        
        ${downloadLink ? `
          <p style="margin-top: 20px;">
            <a href="${downloadLink}" 
               style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Download Statement
            </a>
          </p>
        ` : ''}
        
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          Questions? Reply to this email or contact your property manager.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin-top: 30px;" />
        <p style="color: #999; font-size: 12px;">
          This email was sent by RentKeepers. 
          © ${new Date().getFullYear()} All rights reserved.
        </p>
      </div>
    `;

    const text = `
Dear ${ownerName},

Your owner statement for ${propertyName} is ready for the period of ${period}.

NET TO OWNER: $${netToOwner.toLocaleString('en-US', { minimumFractionDigits: 2 })}

The full statement is attached to this email as a PDF.

${downloadLink ? `Download link: ${downloadLink}` : ''}

Questions? Reply to this email or contact your property manager.

---
Sent by RentKeepers
    `.trim();

    const attachments = pdfPath ? [{
      filename: pdfFilename || 'owner-statement.pdf',
      path: pdfPath
    }] : [];

    return this.send({
      to,
      subject,
      text,
      html,
      attachments
    });
  }

  /**
   * Send test email
   */
  async sendTestEmail(testRecipient) {
    return this.send({
      to: testRecipient,
      subject: '🧪 RentKeepers Email Test',
      text: `
This is a test email from RentKeepers!

If you received this, your email configuration is working correctly.

Test sent at: ${new Date().toISOString()}

---
RentKeepers Email Service
      `.trim(),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">🧪 Email Test Successful!</h2>
          <p>This is a test email from <strong>RentKeepers</strong>.</p>
          <p>If you received this, your email configuration is working correctly!</p>
          <div style="background-color: #f0f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Test sent at:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p style="color: #666; font-size: 14px;">
            Next step: Configure your production SMTP credentials and update the scheduler.
          </p>
        </div>
      `
    });
  }
}

module.exports = new EmailService();
