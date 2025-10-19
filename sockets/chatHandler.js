// sockets/chatHandler.js - Socket.io Chat Handler
const Message = require('../models/Message');
const Order = require('../models/Order');
const User = require('../models/User');

module.exports = (io) => {
  // Socket.io middleware - Authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Token verify
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // User lekérése
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // User hozzáadása a socket-hez
      socket.userId = user._id;
      socket.userRole = user.role;
      socket.userName = user.name;
      
      console.log(`✅ Socket authenticated: ${user.name} (${user.role})`);
      next();
    } catch (error) {
      console.error('Socket auth error:', error);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.userName} (${socket.id})`);

    // JOIN ORDER CHAT
    socket.on('join_order_chat', async (orderId) => {
      try {
        // Order ellenőrzés
        const order = await Order.findOne({ orderId });
        
        if (!order) {
          socket.emit('error', { message: 'Order not found' });
          return;
        }

        // Jogosultság ellenőrzés
        const isCustomer = order.customerId && order.customerId.toString() === socket.userId.toString();
        const isMechanic = order.mechanicId && order.mechanicId.toString() === socket.userId.toString();
        
        if (!isCustomer && !isMechanic) {
          socket.emit('error', { message: 'No access to this order chat' });
          return;
        }

        // Join room
        socket.join(`order_${orderId}`);
        console.log(`📥 ${socket.userName} joined order chat: ${orderId}`);

        // Load chat history
        const messages = await Message.find({ orderId })
          .sort({ createdAt: 1 })
          .limit(50)
          .populate('senderId', 'name role');

        socket.emit('chat_history', messages);
        
        // Notify others
        socket.to(`order_${orderId}`).emit('user_joined', {
          userName: socket.userName,
          userId: socket.userId
        });

      } catch (error) {
        console.error('Join order chat error:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // SEND MESSAGE
    socket.on('send_message', async (data) => {
      try {
        const { orderId, message } = data;

        if (!message || !message.trim()) {
          return;
        }

        // Order ellenőrzés
        const order = await Order.findOne({ orderId });
        
        if (!order) {
          socket.emit('error', { message: 'Order not found' });
          return;
        }

        // Jogosultság ellenőrzés
        const isCustomer = order.customerId && order.customerId.toString() === socket.userId.toString();
        const isMechanic = order.mechanicId && order.mechanicId.toString() === socket.userId.toString();
        
        if (!isCustomer && !isMechanic) {
          socket.emit('error', { message: 'No access to this order chat' });
          return;
        }

        // Sender type meghatározása
        const senderType = socket.userRole === 'mechanic' ? 'mechanic' : 'client';

        // Message mentése DB-be
        const newMessage = new Message({
          orderId,
          senderId: socket.userId,
          senderType,
          message: message.trim(),
          read: false
        });

        await newMessage.save();

        // Populate sender info
        await newMessage.populate('senderId', 'name role avatar');

        // Emit message a room-nak
        io.to(`order_${orderId}`).emit('new_message', {
          _id: newMessage._id,
          orderId: newMessage.orderId,
          senderId: newMessage.senderId,
          senderType: newMessage.senderType,
          message: newMessage.message,
          read: newMessage.read,
          createdAt: newMessage.createdAt
        });

        console.log(`💬 Message sent in order ${orderId} by ${socket.userName}`);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // TYPING INDICATOR
    socket.on('typing', (data) => {
      const { orderId } = data;
      
      socket.to(`order_${orderId}`).emit('user_typing', {
        userId: socket.userId,
        userName: socket.userName
      });
    });

    // STOP TYPING
    socket.on('stop_typing', (data) => {
      const { orderId } = data;
      
      socket.to(`order_${orderId}`).emit('user_stop_typing', {
        userId: socket.userId
      });
    });

    // MESSAGE READ
    socket.on('message_read', async (data) => {
      try {
        const { messageId, orderId } = data;

        // Update message read status
        await Message.findByIdAndUpdate(messageId, { read: true });

        // Notify sender
        socket.to(`order_${orderId}`).emit('message_read_confirmation', {
          messageId
        });

      } catch (error) {
        console.error('Message read error:', error);
      }
    });

    // LEAVE ORDER CHAT
    socket.on('leave_order_chat', (orderId) => {
      socket.leave(`order_${orderId}`);
      console.log(`📤 ${socket.userName} left order chat: ${orderId}`);
      
      socket.to(`order_${orderId}`).emit('user_left', {
        userName: socket.userName,
        userId: socket.userId
      });
    });

    // DISCONNECT
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.userName} (${socket.id})`);
    });
  });
};
