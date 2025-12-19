const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['issue', 'return'],
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  items: [{
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PPEItem',
      required: true
    },
    itemName: String, // Denormalized for history
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    condition: {
      type: String,
      enum: ['new', 'good', 'fair', 'poor', 'damaged'],
      default: 'new'
    },
    // Early issue reason (when issued before usage period expires)
    earlyIssueReason: {
      type: String,
      enum: ['lost', 'damaged', 'not_suitable', 'other', null],
      default: null
    },
    earlyIssueNote: {
      type: String,
      trim: true
    }
  }],
  notes: {
    type: String,
    trim: true
  },
  // For returns - link to original issue transaction
  originalTransaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  // Admin who performed the transaction
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  transactionDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
transactionSchema.index({ driver: 1, transactionDate: -1 });
transactionSchema.index({ type: 1, transactionDate: -1 });
transactionSchema.index({ 'items.item': 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
