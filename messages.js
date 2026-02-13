// routes/messages.js
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

router.get('/:orderId', protect, async (req, res) => {
  try {
    const messages = await Message.find({ orderId: req.params.orderId }).sort({ createdAt: 1 });
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

router.post('/:orderId', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Üzenet szükséges' });

    const message = new Message({
      orderId: req.params.orderId,
      senderId: req.user._id,
      senderType: req.user.role,
      message: text.trim()
    });

    await message.save();
    res.status(201).json({ success: true, message });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

module.exports = router;
