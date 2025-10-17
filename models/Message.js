// models/Message.js - Chat üzenetek

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderType: {
    type: String,
    enum: ['client', 'mechanic'],
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
messageSchema.index({ orderId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);