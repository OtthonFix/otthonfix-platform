<<<<<<< HEAD
// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

messageSchema.index({ orderId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
=======
// models/Message.js - Chat üzenetek

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Megrendelés
  orderId: {
    type: String,
    required: true,
    index: true
  },
  
  // Feladó
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: String,
  senderType: {
    type: String,
    enum: ['mechanic', 'client'],
    required: true
  },
  
  // Üzenet
  message: {
    type: String,
    required: true,
    trim: true
  },
  
  // Olvasva
  isRead: {
    type: Boolean,
    default: false
  },
  
  // Timestamp
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index
messageSchema.index({ orderId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
>>>>>>> 3712dd3a600bf3c5af8b9ab7d5e9a74ed0e0338b
