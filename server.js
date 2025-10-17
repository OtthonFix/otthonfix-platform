<<<<<<< HEAD
// OtthonFix Backend - MongoDB Version with JWT Auth
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');

// Database
const connectDB = require('./config/database');
const User = require('./models/User');
const Order = require('./models/Order');
const Message = require('./models/Message');

// Email Service
const emailService = require('./emailService');

// Auth Middleware
const { protect, restrictTo } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Connect to MongoDB
connectDB();

// Helper Functions
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// ============ AUTH ROUTES ============
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// ============ API ENDPOINTS ============

// Mechanic Registration (DEPRECATED - use /api/auth/register)
app.post('/api/mechanics/register', async (req, res) => {
  try {
    const { name, email, phone, categories, hourlyRate } = req.body;
    
    if (!name || !email || !phone || !categories || !hourlyRate) {
      return res.status(400).json({ error: 'Hiányzó adatok' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Ez az email cím már regisztrálva van' });
    }

    const newMechanic = new User({
      name,
      email: email.toLowerCase(),
      phone,
      password: 'tempPassword123',
      role: 'mechanic',
      categories,
      hourlyRate: parseInt(hourlyRate),
      rating: 5.0,
      reviews: 0,
      avatar: categories.includes('water') ? '💧' : 
              categories.includes('electric') ? '⚡' :
              categories.includes('heating') ? '🔥' : '🔨',
      location: { lat: 47.4979, lng: 19.0402 },
      online: false,
      activeOrders: 0,
      activationToken: generateToken(),
      isActive: false
    });

    await newMechanic.save();
    
    emailService.sendRegistrationConfirmation(newMechanic)
      .then(result => console.log('✅ Reg email sent:', result.success))
      .catch(err => console.error('❌ Email failed:', err.message));
    
    res.json({ 
      success: true, 
      mechanic: newMechanic.toPublicJSON(),
      message: 'Sikeres regisztráció! Ellenőrizd az email fiókodat az aktiváláshoz.' 
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Szerver hiba a regisztráció során' });
  }
});

// Update Mechanic Status - PROTECTED
app.put('/api/mechanics/:id/status', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { online } = req.body;
    
    if (req.user._id.toString() !== id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Csak a saját státuszod módosíthatod' });
    }
    
    const mechanic = await User.findById(id);
    
    if (!mechanic || mechanic.role !== 'mechanic') {
      return res.status(404).json({ error: 'Szerelő nem található' });
    }
    
    mechanic.online = online;
    await mechanic.save();
    
    res.json({ 
      success: true, 
      mechanic: mechanic.toPublicJSON(),
      message: `Státusz: ${online ? 'Online' : 'Offline'}` 
    });

  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: 'Státusz frissítés sikertelen' });
  }
});

// Find Mechanics - PROTECTED
app.post('/api/match', protect, async (req, res) => {
  try {
    const { category, description, location } = req.body;
    
    if (!category) {
      return res.status(400).json({ error: 'Kategória megadása kötelező' });
    }

    const clientLocation = location || { lat: 47.4979, lng: 19.0402 };
    
    const mechanics = await User.find({
      role: 'mechanic',
      online: true,
      categories: category,
      activeOrders: { $lt: 3 }
    });

    if (mechanics.length === 0) {
      return res.status(404).json({ 
        error: 'Jelenleg nincs elérhető szerelő ebben a kategóriában'
      });
    }

    const scored = mechanics.map(mechanic => {
      const distance = calculateDistance(
        clientLocation.lat, clientLocation.lng,
        mechanic.location.lat, mechanic.location.lng
      );
      
      const distanceScore = Math.max(0, 10 - distance) / 10;
      const ratingScore = mechanic.rating / 5;
      const totalScore = (distanceScore * 0.7) + (ratingScore * 0.3);
      
      return {
        ...mechanic.toPublicJSON(),
        distance: distance.toFixed(1),
        score: totalScore
      };
    });

    scored.sort((a, b) => b.score - a.score);

    const order = new Order({
      category,
      description,
      location: clientLocation,
      customerId: req.user._id,
      customerEmail: req.user.email,
      customerName: req.user.name,
      status: 'pending',
      estimatedArrival: '30 perc',
      suggestedMechanics: scored.slice(0, 3).map(m => ({
        mechanicId: m.id,
        distance: parseFloat(m.distance),
        score: m.score
      }))
    });
    
    await order.save();

    res.json({ 
      success: true, 
      mechanics: scored.slice(0, 3),
      orderId: order.orderId
    });

  } catch (error) {
    console.error('Match error:', error);
    res.status(500).json({ error: 'Keresés sikertelen' });
  }
});

// Accept Order - PROTECTED (Mechanics only)
app.post('/api/orders/:orderId/accept', protect, restrictTo('mechanic'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const mechanicId = req.user._id;
    
    const order = await Order.findOne({ orderId });
    const mechanic = await User.findById(mechanicId);
    
    if (!order) {
      return res.status(404).json({ error: 'Megrendelés nem található' });
    }
    
    if (!mechanic || mechanic.role !== 'mechanic') {
      return res.status(404).json({ error: 'Szerelő nem található' });
    }
    
    order.status = 'accepted';
    order.mechanicId = mechanicId;
    order.mechanicName = mechanic.name;
    order.acceptedAt = new Date();
    order.estimatedArrival = '15 perc';
    await order.save();
    
    mechanic.activeOrders += 1;
    await mechanic.save();
    
    io.emit(`order-${orderId}-accepted`, { 
      mechanic: mechanic.toPublicJSON(), 
      order 
    });
    
    res.json({ 
      success: true, 
      order,
      message: 'Megrendelés elfogadva!' 
    });

  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({ error: 'Megrendelés elfogadása sikertelen' });
  }
});

// Get Order Messages - PROTECTED
app.get('/api/orders/:orderId/messages', protect, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ error: 'Megrendelés nem található' });
    }
    
    const isCustomer = order.customerId && order.customerId.toString() === req.user._id.toString();
    const isMechanic = order.mechanicId && order.mechanicId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isCustomer && !isMechanic && !isAdmin) {
      return res.status(403).json({ error: 'Nincs jogosultságod ehhez a megrendeléshez' });
    }
    
    const messages = await Message.find({ orderId }).sort({ createdAt: 1 });
    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Üzenetek lekérése sikertelen' });
  }
});

// Get Mechanics List - PUBLIC
app.get('/api/mechanics', async (req, res) => {
  try {
    const { category, online } = req.query;
    let query = { role: 'mechanic' };
    
    if (category) {
      query.categories = category;
    }
    
    if (online !== undefined) {
      query.online = online === 'true';
    }
    
    const mechanics = await User.find(query);
    res.json({ mechanics: mechanics.map(m => m.toPublicJSON()) });

  } catch (error) {
    console.error('Get mechanics error:', error);
    res.status(500).json({ error: 'Szerelők lekérése sikertelen' });
  }
});

// Submit Review - PROTECTED
app.post('/api/orders/:orderId/review', protect, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rating, comment } = req.body;
    
    const order = await Order.findOne({ orderId });
    
    if (!order || order.status !== 'completed') {
      return res.status(400).json({ error: 'Csak befejezett munkát lehet értékelni' });
    }
    
    if (order.customerId && order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Csak a saját megrendelésed értékelheted' });
    }
    
    if (order.review && order.review.rating) {
      return res.status(400).json({ error: 'Ez a munka már értékelve van' });
    }
    
    const mechanic = await User.findById(order.mechanicId);
    
    if (mechanic) {
      const totalRating = (mechanic.rating * mechanic.reviews) + rating;
      mechanic.reviews += 1;
      mechanic.rating = parseFloat((totalRating / mechanic.reviews).toFixed(1));
      await mechanic.save();
    }
    
    order.review = { rating, comment, createdAt: new Date() };
    await order.save();
    
    res.json({ 
      success: true, 
      message: 'Köszönjük az értékelést!',
      mechanic: mechanic ? mechanic.toPublicJSON() : null
    });

  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ error: 'Értékelés rögzítése sikertelen' });
  }
});

// Get My Orders - PROTECTED
app.get('/api/orders/my-orders', protect, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'mechanic') {
      query.mechanicId = req.user._id;
    } else if (req.user.role === 'client') {
      query.customerId = req.user._id;
    }
    
    const orders = await Order.find(query).sort({ createdAt: -1 });
    
    res.json({ 
      success: true,
      orders 
    });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({ error: 'Megrendelések lekérése sikertelen' });
  }
});

// ============ EMAIL ENDPOINTS ============

app.post('/api/email/test', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email cím hiányzik' });
    }
    const result = await emailService.sendTest(email);
    if (!result.success) {
      return res.status(502).json({ success: false, message: 'Email küldés sikertelen', result });
    }
    return res.json({ success: true, message: `Teszt email elküldve: ${email}`, result });
  } catch (error) {
    console.error('❌ Email teszt hiba:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/email/test', async (req, res) => {
  const email = req.query.email || 'test@example.com';
  try {
    const result = await emailService.sendTest(email);
    if (!result.success) {
      return res.status(502).json({ success: false, message: 'Email küldés sikertelen', result });
    }
    return res.json({ success: true, message: `Teszt email elküldve: ${email}`, result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/email/verify', async (req, res) => {
  try {
    const ok = await emailService.verifyConnection();
    return res.json({ 
      success: ok, 
      provider: 'SENDGRID REST API',
      message: ok ? 'Kapcsolat sikeres' : 'Kapcsolat sikertelen' 
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============ HEALTH CHECK ============

app.get('/health', async (req, res) => {
  try {
    const totalMechanics = await User.countDocuments({ role: 'mechanic' });
    const onlineMechanics = await User.countDocuments({ role: 'mechanic', online: true });
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });

    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'Connected',
      auth: 'JWT Enabled',
      stats: {
        totalMechanics,
        onlineMechanics,
        totalOrders,
        pendingOrders
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR',
      error: error.message
    });
  }
});

// ============ SOCKET.IO ============

io.on('connection', (socket) => {
  console.log('Új kapcsolat:', socket.id);
  
  socket.on('mechanic-online', async (mechanicId) => {
    try {
      const mechanic = await User.findById(mechanicId);
      if (mechanic && mechanic.role === 'mechanic') {
        mechanic.online = true;
        mechanic.socketId = socket.id;
        await mechanic.save();
        io.emit('mechanic-status-changed', { mechanicId, online: true });
      }
    } catch (error) {
      console.error('Socket mechanic-online error:', error);
    }
  });
  
  socket.on('mechanic-offline', async (mechanicId) => {
    try {
      const mechanic = await User.findById(mechanicId);
      if (mechanic && mechanic.role === 'mechanic') {
        mechanic.online = false;
        mechanic.socketId = null;
        await mechanic.save();
        io.emit('mechanic-status-changed', { mechanicId, online: false });
      }
    } catch (error) {
      console.error('Socket mechanic-offline error:', error);
    }
  });
  
  socket.on('send-message', async (data) => {
    try {
      const { orderId, senderId, senderType, message } = data;
      
      const newMessage = new Message({
        orderId,
        senderId,
        senderType,
        message
      });
      
      await newMessage.save();
      io.emit(`order-${orderId}-message`, newMessage);
    } catch (error) {
      console.error('Socket send-message error:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Kapcsolat bontva:', socket.id);
  });
});

// ============ SERVER START ============

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
  console.log(`
  ✅ OtthonFix Backend fut: ${baseUrl}
  🔐 Authentication: JWT Enabled
  ✉️  Email system: ACTIVE
  📧 Email provider: SENDGRID REST API
  🗄️  Database: MongoDB Atlas
  🌐 Environment: ${process.env.NODE_ENV || 'development'}
  
  🔗 Endpoints:
     - Health: ${baseUrl}/health
     - Auth: ${baseUrl}/api/auth/*
     - Email test: ${baseUrl}/api/email/test?email=your@email.com
     - Email verify: ${baseUrl}/api/email/verify
  `);
=======
// OtthonFix Backend - MongoDB Version
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');

// Database
const connectDB = require('./config/database');
const User = require('./models/User');
const Order = require('./models/Order');
const Message = require('./models/Message');

// Email Service
const emailService = require('./emailService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Connect to MongoDB
connectDB();

// Helper Functions
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// ============ API ENDPOINTS ============

// Mechanic Registration
app.post('/api/mechanics/register', async (req, res) => {
  try {
    const { name, email, phone, categories, hourlyRate } = req.body;
    
    if (!name || !email || !phone || !categories || !hourlyRate) {
      return res.status(400).json({ error: 'Hiányzó adatok' });
    }

    // Check if email exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Ez az email cím már regisztrálva van' });
    }

    // Create new mechanic
    const newMechanic = new User({
      name,
      email: email.toLowerCase(),
      phone,
      role: 'mechanic',
      categories,
      hourlyRate: parseInt(hourlyRate),
      rating: 5.0,
      reviews: 0,
      avatar: categories.includes('water') ? '💧' : 
              categories.includes('electric') ? '⚡' :
              categories.includes('heating') ? '🔥' : '🔨',
      location: { lat: 47.4979, lng: 19.0402 },
      online: false,
      activeOrders: 0,
      activationToken: generateToken(),
      isActive: false
    });

    await newMechanic.save();
    
    // Send confirmation email
    emailService.sendRegistrationConfirmation(newMechanic)
      .then(result => console.log('✅ Reg email sent:', result.success))
      .catch(err => console.error('❌ Email failed:', err.message));
    
    res.json({ 
      success: true, 
      mechanic: newMechanic.toPublicJSON(),
      message: 'Sikeres regisztráció! Ellenőrizd az email fiókodat az aktiváláshoz.' 
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Szerver hiba a regisztráció során' });
  }
});

// Update Mechanic Status (Online/Offline)
app.put('/api/mechanics/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { online } = req.body;
    
    const mechanic = await User.findById(id);
    
    if (!mechanic || mechanic.role !== 'mechanic') {
      return res.status(404).json({ error: 'Szerelő nem található' });
    }
    
    mechanic.online = online;
    await mechanic.save();
    
    res.json({ 
      success: true, 
      mechanic: mechanic.toPublicJSON(),
      message: `Státusz: ${online ? 'Online' : 'Offline'}` 
    });

  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: 'Státusz frissítés sikertelen' });
  }
});

// Find Mechanics (Match Algorithm)
app.post('/api/match', async (req, res) => {
  try {
    const { category, description, location, customerEmail, customerName } = req.body;
    
    if (!category) {
      return res.status(400).json({ error: 'Kategória megadása kötelező' });
    }

    const clientLocation = location || { lat: 47.4979, lng: 19.0402 };
    
    // Find available mechanics
    const mechanics = await User.find({
      role: 'mechanic',
      online: true,
      categories: category,
      activeOrders: { $lt: 3 }
    });

    if (mechanics.length === 0) {
      return res.status(404).json({ 
        error: 'Jelenleg nincs elérhető szerelő ebben a kategóriában'
      });
    }

    // Calculate scores
    const scored = mechanics.map(mechanic => {
      const distance = calculateDistance(
        clientLocation.lat, clientLocation.lng,
        mechanic.location.lat, mechanic.location.lng
      );
      
      const distanceScore = Math.max(0, 10 - distance) / 10;
      const ratingScore = mechanic.rating / 5;
      const totalScore = (distanceScore * 0.7) + (ratingScore * 0.3);
      
      return {
        ...mechanic.toPublicJSON(),
        distance: distance.toFixed(1),
        score: totalScore
      };
    });

    scored.sort((a, b) => b.score - a.score);

    // Create order
    const order = new Order({
      category,
      description,
      location: clientLocation,
      customerEmail: customerEmail || 'test@example.com',
      customerName: customerName || 'Teszt Ügyfél',
      status: 'pending',
      estimatedArrival: '30 perc',
      suggestedMechanics: scored.slice(0, 3).map(m => ({
        mechanicId: m.id,
        distance: parseFloat(m.distance),
        score: m.score
      }))
    });
    
    await order.save();

    res.json({ 
      success: true, 
      mechanics: scored.slice(0, 3),
      orderId: order.orderId
    });

  } catch (error) {
    console.error('Match error:', error);
    res.status(500).json({ error: 'Keresés sikertelen' });
  }
});

// Accept Order
app.post('/api/orders/:orderId/accept', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { mechanicId } = req.body;
    
    const order = await Order.findOne({ orderId });
    const mechanic = await User.findById(mechanicId);
    
    if (!order) {
      return res.status(404).json({ error: 'Megrendelés nem található' });
    }
    
    if (!mechanic || mechanic.role !== 'mechanic') {
      return res.status(404).json({ error: 'Szerelő nem található' });
    }
    
    // Update order
    order.status = 'accepted';
    order.mechanicId = mechanicId;
    order.mechanicName = mechanic.name;
    order.acceptedAt = new Date();
    order.estimatedArrival = '15 perc';
    await order.save();
    
    // Update mechanic
    mechanic.activeOrders += 1;
    await mechanic.save();
    
    // Socket.io notification
    io.emit(`order-${orderId}-accepted`, { 
      mechanic: mechanic.toPublicJSON(), 
      order 
    });
    
    res.json({ 
      success: true, 
      order,
      message: 'Megrendelés elfogadva!' 
    });

  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({ error: 'Megrendelés elfogadása sikertelen' });
  }
});

// Get Order Messages
app.get('/api/orders/:orderId/messages', async (req, res) => {
  try {
    const { orderId } = req.params;
    const messages = await Message.find({ orderId }).sort({ createdAt: 1 });
    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Üzenetek lekérése sikertelen' });
  }
});

// Get Mechanics List
app.get('/api/mechanics', async (req, res) => {
  try {
    const { category, online } = req.query;
    let query = { role: 'mechanic' };
    
    if (category) {
      query.categories = category;
    }
    
    if (online !== undefined) {
      query.online = online === 'true';
    }
    
    const mechanics = await User.find(query);
    res.json({ mechanics: mechanics.map(m => m.toPublicJSON()) });

  } catch (error) {
    console.error('Get mechanics error:', error);
    res.status(500).json({ error: 'Szerelők lekérése sikertelen' });
  }
});

// Submit Review
app.post('/api/orders/:orderId/review', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rating, comment } = req.body;
    
    const order = await Order.findOne({ orderId });
    
    if (!order || order.status !== 'completed') {
      return res.status(400).json({ error: 'Csak befejezett munkát lehet értékelni' });
    }
    
    if (order.review && order.review.rating) {
      return res.status(400).json({ error: 'Ez a munka már értékelve van' });
    }
    
    const mechanic = await User.findById(order.mechanicId);
    
    if (mechanic) {
      const totalRating = (mechanic.rating * mechanic.reviews) + rating;
      mechanic.reviews += 1;
      mechanic.rating = parseFloat((totalRating / mechanic.reviews).toFixed(1));
      await mechanic.save();
    }
    
    order.review = { rating, comment, createdAt: new Date() };
    await order.save();
    
    res.json({ 
      success: true, 
      message: 'Köszönjük az értékelést!',
      mechanic: mechanic ? mechanic.toPublicJSON() : null
    });

  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ error: 'Értékelés rögzítése sikertelen' });
  }
});

// ============ EMAIL ENDPOINTS ============

app.post('/api/email/test', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email cím hiányzik' });
    }
    const result = await emailService.sendTest(email);
    if (!result.success) {
      return res.status(502).json({ success: false, message: 'Email küldés sikertelen', result });
    }
    return res.json({ success: true, message: `Teszt email elküldve: ${email}`, result });
  } catch (error) {
    console.error('❌ Email teszt hiba:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/email/test', async (req, res) => {
  const email = req.query.email || 'test@example.com';
  try {
    const result = await emailService.sendTest(email);
    if (!result.success) {
      return res.status(502).json({ success: false, message: 'Email küldés sikertelen', result });
    }
    return res.json({ success: true, message: `Teszt email elküldve: ${email}`, result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/email/verify', async (req, res) => {
  try {
    const ok = await emailService.verifyConnection();
    return res.json({ 
      success: ok, 
      provider: 'SENDGRID REST API',
      message: ok ? 'Kapcsolat sikeres' : 'Kapcsolat sikertelen' 
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============ HEALTH CHECK ============

app.get('/health', async (req, res) => {
  try {
    const totalMechanics = await User.countDocuments({ role: 'mechanic' });
    const onlineMechanics = await User.countDocuments({ role: 'mechanic', online: true });
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });

    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'Connected',
      stats: {
        totalMechanics,
        onlineMechanics,
        totalOrders,
        pendingOrders
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR',
      error: error.message
    });
  }
});

// ============ SOCKET.IO ============

io.on('connection', (socket) => {
  console.log('Új kapcsolat:', socket.id);
  
  socket.on('mechanic-online', async (mechanicId) => {
    try {
      const mechanic = await User.findById(mechanicId);
      if (mechanic && mechanic.role === 'mechanic') {
        mechanic.online = true;
        mechanic.socketId = socket.id;
        await mechanic.save();
        io.emit('mechanic-status-changed', { mechanicId, online: true });
      }
    } catch (error) {
      console.error('Socket mechanic-online error:', error);
    }
  });
  
  socket.on('mechanic-offline', async (mechanicId) => {
    try {
      const mechanic = await User.findById(mechanicId);
      if (mechanic && mechanic.role === 'mechanic') {
        mechanic.online = false;
        mechanic.socketId = null;
        await mechanic.save();
        io.emit('mechanic-status-changed', { mechanicId, online: false });
      }
    } catch (error) {
      console.error('Socket mechanic-offline error:', error);
    }
  });
  
  socket.on('send-message', async (data) => {
    try {
      const { orderId, senderId, senderType, message } = data;
      
      const newMessage = new Message({
        orderId,
        senderId,
        senderType,
        message
      });
      
      await newMessage.save();
      io.emit(`order-${orderId}-message`, newMessage);
    } catch (error) {
      console.error('Socket send-message error:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Kapcsolat bontva:', socket.id);
  });
});

// ============ SERVER START ============

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
  console.log(`
  ✅ OtthonFix Backend fut: ${baseUrl}
  ✉️  Email system: ACTIVE
  📧 Email provider: SENDGRID REST API
  🗄️  Database: MongoDB Atlas
  🌐 Environment: ${process.env.NODE_ENV || 'development'}
  
  🔗 Endpoints:
     - Health: ${baseUrl}/health
     - Email test: ${baseUrl}/api/email/test?email=your@email.com
     - Email verify: ${baseUrl}/api/email/verify
  `);
>>>>>>> 3712dd3a600bf3c5af8b9ab7d5e9a74ed0e0338b
});