const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PPEItem',
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  currentStock: {
    type: Number,
    required: true
  },
  orderQuantity: {
    type: Number,
    required: true,
    min: 1
  },
  receivedQuantity: {
    type: Number,
    default: 0
  },
  receivedDate: Date,
  size: String,
  type: String
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
  },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: ['pending', 'sent', 'partial', 'received', 'cancelled'],
    default: 'pending'
  },
  notes: String,
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receivedAt: Date,
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `ORD-${year}${month}${day}-${random}`;
  }
  next();
});

// Virtual to check if fully received
orderSchema.virtual('isFullyReceived').get(function() {
  return this.items.every(item => item.receivedQuantity >= item.orderQuantity);
});

// Virtual to get total ordered quantity
orderSchema.virtual('totalOrdered').get(function() {
  return this.items.reduce((sum, item) => sum + item.orderQuantity, 0);
});

// Virtual to get total received quantity
orderSchema.virtual('totalReceived').get(function() {
  return this.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
});

orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Order', orderSchema);
