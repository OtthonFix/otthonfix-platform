// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const connectDB = require('./config/database');
const User = require('./models/User');

const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');
const invoiceRoutes = require('./routes/invoices');
const adminRoutes = require('./routes/admin');
const messageRoutes = require('./routes/messages');
const emailService = require('./services/emailService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);

app.get('/api/districts', (req, res) => {
  res.json({ success: true, districts: User.getDistricts() });
});

app.get('/api/mechanics', async (req, res) => {
  try {
    const { category, district } = req.query;
    let query = { role: 'mechanic', isActive: true };
    if (category) query.categories = category;
    if (district) query.areas = district;

    const mechanics = await User.find(query)
      .select('name avatar rating reviews categories areas hourlyRate online completedJobs')
      .sort({ rating: -1 });

    res.json({ success: true, mechanics });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

app.post('/api/email/test', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email szükséges' });
    const result = await emailService.sendTest(email);
    res.json({ success: result.success, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/email/verify', async (req, res) => {
  const ok = await emailService.verifyConnection();
  res.json({ success: ok, provider: 'SendGrid' });
});

app.get('/health', async (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  socket.on('authenticate', async (data) => {
    if (data?.userId) {
      await User.findByIdAndUpdate(data.userId, { socketId: socket.id, online: true });
      socket.userId = data.userId;
    }
  });

  socket.on('disconnect', async () => {
    if (socket.userId) {
      await User.findByIdAndUpdate(socket.userId, { online: false });
    }
  });
});

app.use((req, res) => res.status(404).json({ error: 'Nem található' }));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   🔧 OtthonFix Backend - RUNNING     ║
  ╠══════════════════════════════════════╣
  ║   🌐 http://localhost:${PORT}            ║
  ║   📧 Email: SendGrid                 ║
  ║   🗄️  Database: MongoDB              ║
  ╚══════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };
