// routes/messages.js - Message API Routes
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Message = require('../models/Message');
const Order = require('../models/Order');

// GET /api/messages/:orderId - Get messages for an order
router.get('/:orderId', protect, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Check if order exists
    const order = await Order.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Check access permissions
    const isCustomer = order.customerId && order.customerId.toString() === req.user._id.toString();
    const isMechanic = order.mechanicId && order.mechanicId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isCustomer && !isMechanic && !isAdmin) {
      return res.status(403).json({ error: 'No access to this order chat' });
    }
    
    // Get messages
    const messages = await Message.find({ orderId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name role avatar');
    
    res.json({
      success: true,
      orderId,
      messages
    });
    
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// GET /api/messages/unread/count - Get unread message count
router.get('/unread/count', protect, async (req, res) => {
  try {
    // Find all orders where user is customer or mechanic
    const orders = await Order.find({
      $or: [
        { customerId: req.user._id },
        { mechanicId: req.user._id }
      ]
    }).select('orderId');
    
    const orderIds = orders.map(o => o.orderId);
    
    // Count unread messages
    const unreadCount = await Message.countDocuments({
      orderId: { $in: orderIds },
      senderId: { $ne: req.user._id },
      read: false
    });
    
    res.json({
      success: true,
      unreadCount
    });
    
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// PUT /api/messages/:messageId/read - Mark message as read
router.put('/:messageId/read', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Update read status
    message.read = true;
    await message.save();
    
    res.json({
      success: true,
      message: 'Message marked as read'
    });
    
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// PUT /api/messages/:orderId/read-all - Mark all messages as read for an order
router.put('/:orderId/read-all', protect, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Update all messages
    await Message.updateMany(
      {
        orderId,
        senderId: { $ne: req.user._id },
        read: false
      },
      {
        read: true
      }
    );
    
    res.json({
      success: true,
      message: 'All messages marked as read'
    });
    
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

module.exports = router;
