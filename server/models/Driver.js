const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  photo: {
    type: String, // URL or base64 string
    default: ''
  },
  department: {
    type: String,
    trim: true
  },
  // Currently issued items (denormalized for quick access)
  currentlyIssuedItems: [{
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PPEItem'
    },
    quantity: Number,
    issuedDate: Date,
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    }
  }],
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
driverSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Driver', driverSchema);
