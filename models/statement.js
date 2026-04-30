const mongoose = require('mongoose');

/**
 * Owner Statement Schema
 * Stores metadata about generated statements
 */
const statementSchema = new mongoose.Schema({
  // Identifiers
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Owner',
    required: true,
    index: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true,
    index: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },

  // Statement Period
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },

  // Property snapshot
  propertyName: String,
  propertyAddress: {
    street: String,
    city: String,
    state: String,
    zip: String
  },
  unitCount: Number,

  // Financial Summary
  summary: {
    totalIncome: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    managementFee: { type: Number, default: 0 },
    netToOwner: { type: Number, default: 0 }
  },

  // Transaction count
  transactionCount: Number,

  // Status
  status: {
    type: String,
    enum: ['generating', 'ready', 'sent', 'viewed', 'archived'],
    default: 'generating'
  },

  // File info
  file: {
    filename: String,
    size: Number,
    path: String,
    url: String,
    expiresAt: Date
  },

  // Email delivery
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date,
  emailRecipients: [String],

  // View tracking
  viewedAt: Date,
  viewCount: {
    type: Number,
    default: 0
  },

  // Generation metadata
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
statementSchema.index({ ownerId: 1, year: -1, month: -1 });
statementSchema.index({ propertyId: 1, year: -1, month: -1 });
statementSchema.index({ companyId: 1, status: 1 });
statementSchema.index({ 'file.expiresAt': 1 }, { expire: '1h' });

// Virtual for formatted period
statementSchema.virtual('period').get(function() {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${monthNames[this.month - 1]} ${this.year}`;
});

// Method to mark as sent
statementSchema.methods.markAsSent = function(recipients) {
  this.status = 'sent';
  this.emailSent = true;
  this.emailSentAt = new Date();
  this.emailRecipients = recipients;
  return this.save();
};

// Method to record view
statementSchema.methods.recordView = function() {
  this.status = 'viewed';
  this.viewedAt = new Date();
  this.viewCount += 1;
  return this.save();
};

// Static method to get latest statement for owner
statementSchema.statics.getLatestForOwner = function(ownerId, limit = 12) {
  return this.find({ ownerId })
    .sort({ year: -1, month: -1 })
    .limit(limit)
    .populate('propertyId', 'name address');
};

// Static method to get statements for bulk generation
statementSchema.statics.getPendingGeneration = function(companyId, month, year) {
  return this.find({
    companyId,
    month,
    year,
    status: 'generating'
  }).populate('ownerId propertyId');
};

module.exports = mongoose.model('Statement', statementSchema);
