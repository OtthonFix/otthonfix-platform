// models/Job.js
const mongoose = require('mongoose');

const BUDAPEST_DISTRICTS = [
  'I. kerület', 'II. kerület', 'III. kerület', 'IV. kerület',
  'V. kerület', 'VI. kerület', 'VII. kerület', 'VIII. kerület',
  'IX. kerület', 'X. kerület', 'XI. kerület', 'XII. kerület',
  'XIII. kerület', 'XIV. kerület', 'XV. kerület', 'XVI. kerület',
  'XVII. kerület', 'XVIII. kerület', 'XIX. kerület', 'XX. kerület',
  'XXI. kerület', 'XXII. kerület', 'XXIII. kerület'
];

const jobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true },
  
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientName: { type: String, required: true },
  clientEmail: { type: String, required: true },
  clientPhone: String,
  
  district: { type: String, enum: BUDAPEST_DISTRICTS, required: true },
  street: { type: String, required: true, trim: true },
  houseNumber: { type: String, trim: true },
  fullAddress: String,
  
  category: { type: String, enum: ['water', 'electric', 'heating', 'locksmith'], required: true },
  categoryName: String,
  description: { type: String, required: true, trim: true },
  urgency: { type: String, enum: ['normal', 'urgent', 'emergency'], default: 'normal' },
  
  status: {
    type: String,
    enum: ['new', 'notified', 'accepted', 'in_progress', 'completed', 'invoiced', 'paid', 'cancelled'],
    default: 'new'
  },
  
  mechanicId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  mechanicName: String,
  mechanicPhone: String,
  
  notifiedMechanics: [{
    oderId: mongoose.Schema.Types.ObjectId,
    name: String,
    notifiedAt: { type: Date, default: Date.now },
    emailSent: Boolean
  }],
  notificationCount: { type: Number, default: 0 },
  
  createdAt: { type: Date, default: Date.now },
  acceptedAt: Date,
  startedAt: Date,
  completedAt: Date,
  
  estimatedPrice: Number,
  finalPrice: Number,
  commissionRate: { type: Number, default: 10 },
  commissionAmount: Number,
  invoiceUrl: String,
  
  review: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    createdAt: Date
  },
  
  updatedAt: { type: Date, default: Date.now }
});

jobSchema.index({ district: 1, category: 1, status: 1 });
jobSchema.index({ clientId: 1 });
jobSchema.index({ mechanicId: 1 });

jobSchema.pre('save', function(next) {
  if (!this.jobId) {
    this.jobId = `JOB-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }
  
  const names = { water: 'Vízszerelés', electric: 'Villanyszerelés', heating: 'Fűtésszerelés', locksmith: 'Zárcsere' };
  this.categoryName = names[this.category];
  this.fullAddress = `${this.district}, ${this.street}${this.houseNumber ? ' ' + this.houseNumber : ''}`;
  
  if (this.finalPrice && !this.commissionAmount) {
    this.commissionAmount = Math.round(this.finalPrice * (this.commissionRate / 100));
  }
  
  this.updatedAt = Date.now();
  next();
});

jobSchema.statics.getDistricts = function() {
  return BUDAPEST_DISTRICTS;
};

module.exports = mongoose.model('Job', jobSchema);
module.exports.BUDAPEST_DISTRICTS = BUDAPEST_DISTRICTS;
