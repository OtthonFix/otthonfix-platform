// models/User.js - Felhasználók (Mechanics + Clients)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Közös mezők
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['mechanic', 'client', 'admin'],
    required: true
  },
  
  // Mechanic specifikus mezők
  categories: [{
    type: String,
    enum: ['water', 'electric', 'heating', 'lock']
  }],
  hourlyRate: {
    type: Number,
    min: 0
  },
  rating: {
    type: Number,
    default: 5.0,
    min: 0,
    max: 5
  },
  reviews: {
    type: Number,
    default: 0
  },
  avatar: {
    type: String,
    default: '🔧'
  },
  location: {
    lat: Number,
    lng: Number
  },
  online: {
    type: Boolean,
    default: false
  },
  activeOrders: {
    type: Number,
    default: 0
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  activationToken: String,
  
  // Socket.io
  socketId: String,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
userSchema.index({ role: 1, online: 1 });
userSchema.index({ location: '2dsphere' });

// Password hash middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Update updatedAt before save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for mechanic specialty display
userSchema.virtual('specialty').get(function() {
  if (this.role !== 'mechanic' || !this.categories || this.categories.length === 0) {
    return '';
  }
  const categoryNames = {
    water: 'Vízszerelő',
    electric: 'Villanyszerelő',
    heating: 'Fűtésszerelő',
    lock: 'Lakatos'
  };
  return categoryNames[this.categories[0]] || '';
});

// Method to get public profile
userSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    categories: this.categories,
    hourlyRate: this.hourlyRate,
    rating: this.rating,
    reviews: this.reviews,
    avatar: this.avatar,
    location: this.location,
    online: this.online,
    specialty: this.specialty
  };
};

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);