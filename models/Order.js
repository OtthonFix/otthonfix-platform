<<<<<<< HEAD
// models/Order.js - Megrendelések

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Order azonosító
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Ügyfél adatok
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerPhone: String,
  
  // Szerelő adatok
  mechanicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  mechanicName: String,
  
  // Megrendelés részletei
  category: {
    type: String,
    enum: ['water', 'electric', 'heating', 'lock'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  
  // Lokáció
  location: {
    lat: Number,
    lng: Number
  },
  address: String,
  
  // Státusz
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // Időpontok
  createdAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: Date,
  completedAt: Date,
  
  // Becsült érkezés
  estimatedArrival: {
    type: String,
    default: '30 perc'
  },
  
  // Ár
  finalPrice: Number,
  
  // Értékelés
  review: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: Date
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexek
orderSchema.index({ orderId: 1 });
orderSchema.index({ customerId: 1 });
orderSchema.index({ mechanicId: 1 });
orderSchema.index({ status: 1 });

// Update updatedAt
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate orderId
orderSchema.pre('save', function(next) {
  if (!this.orderId) {
    this.orderId = `ORD-${Date.now()}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
=======
// models/Order.js - Megrendelések

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Order azonosító
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Ügyfél adatok
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerPhone: String,
  
  // Szerelő adatok
  mechanicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  mechanicName: String,
  
  // Megrendelés részletei
  category: {
    type: String,
    enum: ['water', 'electric', 'heating', 'lock'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  
  // Lokáció
  location: {
    lat: Number,
    lng: Number
  },
  address: String,
  
  // Státusz
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // Időpontok
  createdAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: Date,
  completedAt: Date,
  
  // Becsült érkezés
  estimatedArrival: {
    type: String,
    default: '30 perc'
  },
  
  // Ár
  finalPrice: Number,
  
  // Értékelés
  review: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: Date
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexek
orderSchema.index({ customerId: 1 });
orderSchema.index({ mechanicId: 1 });
orderSchema.index({ status: 1 });

// Update updatedAt
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate orderId
orderSchema.pre('save', function(next) {
  if (!this.orderId) {
    this.orderId = `ORD-${Date.now()}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
>>>>>>> 3712dd3a600bf3c5af8b9ab7d5e9a74ed0e0338b
