const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  to: { type: String, required: true, index: true },
  subject: String,
  templateName: { type: String, required: true },
  userId: String,
  userType: { type: String, enum: ['customer', 'mechanic', 'admin'] },
  status: {
    type: String,
    enum: ['queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'],
    default: 'queued'
  },
  messageId: String,
  error: String,
  sentAt: Date,
  deliveredAt: Date,
  openedAt: Date,
  failedAt: Date,
  processingTime: Number,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

emailLogSchema.index({ status: 1, createdAt: -1 });
emailLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);