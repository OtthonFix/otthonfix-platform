// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const BUDAPEST_DISTRICTS = [
  'I. kerület', 'II. kerület', 'III. kerület', 'IV. kerület',
  'V. kerület', 'VI. kerület', 'VII. kerület', 'VIII. kerület',
  'IX. kerület', 'X. kerület', 'XI. kerület', 'XII. kerület',
  'XIII. kerület', 'XIV. kerület', 'XV. kerület', 'XVI. kerület',
  'XVII. kerület', 'XVIII. kerület', 'XIX. kerület', 'XX. kerület',
  'XXI. kerület', 'XXII. kerület', 'XXIII. kerület'
];

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, enum: ['mechanic', 'client', 'admin'], required: true },
  
  // Szerelő mezők
  categories: [{ type: String, enum: ['water', 'electric', 'heating', 'locksmith'] }],
  areas: [{ type: String, enum: BUDAPEST_DISTRICTS }],
  hourlyRate: { type: Number, min: 0, default: 8000 },
  callOutFee: { type: Number, default: 3000 },
  rating: { type: Number, default: 5.0, min: 0, max: 5 },
  reviews: { type: Number, default: 0 },
  avatar: { type: String, default: '🔧' },
  bio: { type: String, maxlength: 500 },
  
  // Státusz
  online: { type: Boolean, default: false },
  available: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  
  // Munkák
  activeJobs: { type: Number, default: 0 },
  maxActiveJobs: { type: Number, default: 3 },
  completedJobs: { type: Number, default: 0 },
  
  // Pénzügyek
  totalEarnings: { type: Number, default: 0 },
  pendingPayout: { type: Number, default: 0 },
  
  // Értesítések
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true }
  },
  
  // Rendszer
  activationToken: String,
  socketId: String,
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

userSchema.index({ role: 1, areas: 1, categories: 1 });
userSchema.index({ email: 1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

userSchema.methods.toPublicJSON = function() {
  const base = {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    avatar: this.avatar,
    createdAt: this.createdAt
  };

  if (this.role === 'mechanic') {
    return {
      ...base,
      categories: this.categories,
      areas: this.areas,
      hourlyRate: this.hourlyRate,
      callOutFee: this.callOutFee,
      rating: this.rating,
      reviews: this.reviews,
      online: this.online,
      available: this.available,
      completedJobs: this.completedJobs,
      bio: this.bio,
      activeJobs: this.activeJobs,
      totalEarnings: this.totalEarnings,
      pendingPayout: this.pendingPayout
    };
  }
  return base;
};

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.statics.findMechanicsForJob = async function(district, category) {
  return this.find({
    role: 'mechanic',
    isActive: true,
    areas: district,
    categories: category,
    'notifications.email': true
  }).sort({ rating: -1, completedJobs: -1 });
};

userSchema.statics.getDistricts = function() {
  return BUDAPEST_DISTRICTS;
};

module.exports = mongoose.model('User', userSchema);
module.exports.BUDAPEST_DISTRICTS = BUDAPEST_DISTRICTS;
