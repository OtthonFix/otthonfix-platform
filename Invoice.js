// models/Invoice.js
const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceId: { type: String, required: true, unique: true },
  jobId: { type: String, required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  
  mechanicId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mechanicName: { type: String, required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  clientName: String,
  
  grossAmount: { type: Number, required: true },
  commissionRate: { type: Number, default: 10 },
  commissionAmount: { type: Number, required: true },
  netAmount: { type: Number, required: true },
  
  fileUrl: { type: String, required: true },
  fileName: String,
  
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'paid'], default: 'pending' },
  
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  rejectionReason: String,
  
  isPaid: { type: Boolean, default: false },
  paidAt: Date,
  paymentMethod: String,
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

invoiceSchema.index({ mechanicId: 1, status: 1 });
invoiceSchema.index({ jobId: 1 });

invoiceSchema.pre('save', function(next) {
  if (!this.invoiceId) {
    this.invoiceId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }
  
  if (this.grossAmount) {
    this.commissionAmount = Math.round(this.grossAmount * (this.commissionRate / 100));
    this.netAmount = this.grossAmount - this.commissionAmount;
  }
  
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
