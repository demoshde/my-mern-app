const mongoose = require('mongoose');

const ppeItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  photo: {
    type: String, // URL or base64 string
    default: ''
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 10,
    min: 0
  },
  // Custom fields
  size: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    trim: true
  },
  expiryDate: {
    type: Date
  },
  // Usage duration in days (how long before a new one can be issued)
  usageDays: {
    type: Number,
    default: 0, // 0 means no restriction
    min: 0
  },
  // Custom fields as key-value pairs for flexibility
  customFields: [{
    fieldName: String,
    fieldValue: String
  }],
  // QR/Barcode
  barcode: {
    type: String,
    unique: true,
    sparse: true
  },
  qrCode: {
    type: String // Generated QR code data URL
  },
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
ppeItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for low stock status
ppeItemSchema.virtual('isLowStock').get(function() {
  return this.quantity <= this.lowStockThreshold;
});

// Ensure virtuals are included in JSON
ppeItemSchema.set('toJSON', { virtuals: true });
ppeItemSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('PPEItem', ppeItemSchema);
