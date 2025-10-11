require('dotenv').config();

// OtthonFix Backend - Node.js + Express + Socket.io + EMAIL
// npm install express socket.io cors body-parser nodemailer

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');

// ✉️ EMAIL SERVICE IMPORT (HELYES ÚTVONAL)
const emailService = require('./emailService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// In-memory adatbázis
const database = {
  mechanics: [
    {
      id: 1,
      name: "Kovács János",
      email: "kovacs@fixfast.hu",
      phone: "+36201234567",
      categories: ["water"],
      hourlyRate: 8000,
      rating: 4.9,
      reviews: 127,
      avatar: "👨‍🔧",
      location: { lat: 47.4979, lng: 19.0402 },
      online: true,
      activeOrders: 0
    },
    {
      id: 2,
      name: "Nagy Péter",
      email: "nagy@fixfast.hu",
      phone: "+36209876543",
      categories: ["electric"],
      hourlyRate: 9500,
      rating: 4.8,
      reviews: 203,
      avatar: "⚡",
      location: { lat: 47.5102, lng: 19.0557 },
      online: true,
      activeOrders: 1
    },
    {
      id: 3,
      name: "Tóth András",
      email: "toth@fixfast.hu",
      phone: "+36207654321",
      categories: ["heating", "water"],
      hourlyRate: 7500,
      rating: 4.7,
      reviews: 89,
      avatar: "🔥",
      location: { lat: 47.4813, lng: 19.0567 },
      online: false,
      activeOrders: 0
    }
  ],
  clients: [],
  orders: [],
  messages: []
};

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

function findBestMechanic(category, clientLocation) {
  const available = database.mechanics.filter(m => 
    m.online && 
    m.categories.includes(category) &&
    m.activeOrders < 3
  );

  if (available.length === 0) return null;

  const scored = available.map(mechanic => {
    const distance = calculateDistance(
      clientLocation.lat, clientLocation.lng,
      mechanic.location.lat, mechanic.location.lng
    );
    
    const distanceScore = Math.max(0, 10 - distance) / 10;
    const ratingScore = mechanic.rating / 5;
    const totalScore = (distanceScore * 0.7) + (ratingScore * 0.3);
    
    return {
      ...mechanic,
      distance: distance.toFixed(1),
      score: totalScore
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// REST API végpontok

app.post('/api/mechanics/register', async (req, res) => {
  const { name, email, phone, categories, hourlyRate } = req.body;
  
  if (!name || !email || !phone || !categories || !hourlyRate) {
    return res.status(400).json({ error: 'Hiányzó adatok' });
  }

  const newMechanic = {
    id: database.mechanics.length + 1,
    name,
    email,
    phone,
    categories,
    hourlyRate: parseInt(hourlyRate),
    rating: 5.0,
    reviews: 0,
    avatar: categories.includes('water') ? '💧' : 
            categories.includes('electric') ? '⚡' :
            categories.includes('heating') ? '🔥' : '🔐',
    location: { lat: 47.4979, lng: 19.0402 },
    online: false,
    activeOrders: 0,
    activationToken: generateToken(),
    createdAt: new Date().toISOString()
  };

  database.mechanics.push(newMechanic);
  
  emailService.sendRegistrationConfirmation(newMechanic)
    .then(result => console.log('✅ Reg email sent'))
    .catch(err => console.error('❌ Email failed:', err.message));
  
  res.json({ 
    success: true, 
    mechanic: newMechanic,
    message: 'Sikeres regisztráció!' 
  });
});

app.put('/api/mechanics/:id/status', (req, res) => {
  const { id } = req.params;
  const { online } = req.body;
  
  const mechanic = database.mechanics.find(m => m.id === parseInt(id));
  
  if (!mechanic) {
    return res.status(404).json({ error: 'Szerelő nem található' });
  }
  
  mechanic.online = online;
  
  res.json({ 
    success: true, 
    mechanic,
    message: `Státusz: ${online ? 'Online' : 'Offline'}` 
  });
});

app.post('/api/match', async (req, res) => {
  const { category, description, location, customerEmail, customerName } = req.body;
  
  if (!category) {
    return res.status(400).json({ error: 'Kategória megadása kötelező' });
  }

  const clientLocation = location || { lat: 47.4979, lng: 19.0402 };
  const mechanics = findBestMechanic(category, clientLocation);
  
  if (!mechanics || mechanics.length === 0) {
    return res.status(404).json({ 
      error: 'Jelenleg nincs elérhető szerelő'
    });
  }

  const order = {
    id: `ORD-${Date.now()}`,
    category,
    description,
    clientLocation,
    customerEmail: customerEmail || 'test@example.com',
    customerName: customerName || 'Teszt Ügyfél',
    mechanics: mechanics.slice(0, 3),
    status: 'pending',
    estimatedArrival: '30 perc',
    createdAt: new Date().toISOString()
  };
  
  database.orders.push(order);

  res.json({ 
    success: true, 
    mechanics: mechanics.slice(0, 3),
    orderId: order.id
  });
});

app.post('/api/orders/:orderId/accept', async (req, res) => {
  const { orderId } = req.params;
  const { mechanicId } = req.body;
  
  const order = database.orders.find(o => o.id === orderId);
  const mechanic = database.mechanics.find(m => m.id === mechanicId);
  
  if (!order || !mechanic) {
    return res.status(404).json({ error: 'Megrendelés vagy szerelő nem található' });
  }
  
  order.status = 'accepted';
  order.mechanicId = mechanicId;
  order.acceptedAt = new Date().toISOString();
  order.estimatedArrival = '15 perc';
  
  mechanic.activeOrders += 1;
  
  io.emit(`order-${orderId}-accepted`, { mechanic, order });
  
  res.json({ 
    success: true, 
    order,
    message: 'Megrendelés elfogadva!' 
  });
});

app.get('/api/orders/:orderId/messages', (req, res) => {
  const { orderId } = req.params;
  const messages = database.messages.filter(m => m.orderId === orderId);
  res.json({ messages });
});

app.get('/api/mechanics', (req, res) => {
  const { category, online } = req.query;
  let mechanics = database.mechanics;
  
  if (category) {
    mechanics = mechanics.filter(m => m.categories.includes(category));
  }
  
  if (online !== undefined) {
    mechanics = mechanics.filter(m => m.online === (online === 'true'));
  }
  
  res.json({ mechanics });
});

app.post('/api/orders/:orderId/review', (req, res) => {
  const { orderId } = req.params;
  const { rating, comment } = req.body;
  
  const order = database.orders.find(o => o.id === orderId);
  
  if (!order || order.status !== 'completed') {
    return res.status(400).json({ error: 'Csak befejezett munkát lehet értékelni' });
  }
  
  const mechanic = database.mechanics.find(m => m.id === order.mechanicId);
  
  if (mechanic) {
    const totalRating = (mechanic.rating * mechanic.reviews) + rating;
    mechanic.reviews += 1;
    mechanic.rating = (totalRating / mechanic.reviews).toFixed(1);
  }
  
  order.review = { rating, comment, createdAt: new Date().toISOString() };
  
  res.json({ 
    success: true, 
    message: 'Köszönjük az értékelést!',
    mechanic 
  });
});

app.post('/api/email/test', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email cím hiányzik' 
    });
  }
  
  try {
    const result = await emailService.sendEmail({
      to: email,
      subject: 'OtthonFix - Email Teszt ✅',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366f1;">🏠 OtthonFix</h1>
          <h2>Email rendszer működik!</h2>
          <p>Ez egy teszt email az OtthonFix platformtól.</p>
          <p><strong>Sikeres teszt!</strong> ✅</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            OtthonFix - Otthoni problémák azonnali megoldása<br>
            <a href="mailto:support@otthonfix.com">support@otthonfix.com</a>
          </p>
        </div>
      `
    });
    
    res.json({ 
      success: true, 
      result: result,
      message: 'Email sikeresen elküldve!' 
    });
  } catch (error) {
    console.error('❌ Email teszt hiba:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

io.on('connection', (socket) => {
  console.log('Új kapcsolat:', socket.id);
  
  socket.on('mechanic-online', (mechanicId) => {
    const mechanic = database.mechanics.find(m => m.id === mechanicId);
    if (mechanic) {
      mechanic.online = true;
      mechanic.socketId = socket.id;
      io.emit('mechanic-status-changed', { mechanicId, online: true });
    }
  });
  
  socket.on('mechanic-offline', (mechanicId) => {
    const mechanic = database.mechanics.find(m => m.id === mechanicId);
    if (mechanic) {
      mechanic.online = false;
      mechanic.socketId = null;
      io.emit('mechanic-status-changed', { mechanicId, online: false });
    }
  });
  
  socket.on('send-message', (data) => {
    const { orderId, senderId, senderType, message } = data;
    
    const newMessage = {
      id: database.messages.length + 1,
      orderId,
      senderId,
      senderType,
      message,
      timestamp: new Date().toISOString()
    };
    
    database.messages.push(newMessage);
    io.emit(`order-${orderId}-message`, newMessage);
  });
  
  socket.on('disconnect', () => {
    console.log('Kapcsolat bontva:', socket.id);
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    stats: {
      totalMechanics: database.mechanics.length,
      onlineMechanics: database.mechanics.filter(m => m.online).length,
      totalOrders: database.orders.length,
      pendingOrders: database.orders.filter(o => o.status === 'pending').length
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
  ✅ OtthonFix Backend fut: http://localhost:${PORT}
  ✉️  Email system: ACTIVE
  `);
});