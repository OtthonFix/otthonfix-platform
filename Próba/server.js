// OtthonFix Backend - Node.js + Express + Socket.io + EMAIL
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');

// ✉️ EMAIL SERVICE IMPORT
const emailService = require('./emailService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ... (az in-memory DB és a helper függvények maradhatnak változatlanul)

// == VÉGPONTOK RÖVIDÍTVE — csak az emailt érintő részeket módosítjuk ==

// JAVÍTOTT: Email teszt endpoint - POST
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

// JAVÍTOTT: Email teszt endpoint - GET (böngészős próba)
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

// Email kapcsolat ellenőrzés
app.get('/api/email/verify', async (req, res) => {
  try {
    const ok = await emailService.verifyConnection();
    return res.json({ success: ok, provider: emailService.primaryProvider || 'SENDGRID REST API',
      message: ok ? 'Kapcsolat sikeres' : 'Kapcsolat sikertelen' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ... (Socket.io és egyéb végpontok változatlanok)

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
  const providerSafe = (emailService.primaryProvider || 'SENDGRID REST API').toString().toUpperCase();
  console.log(`
  ✅ OtthonFix Backend fut: ${baseUrl}
  ✉️  Email system: ACTIVE
  📧 Email provider: ${providerSafe}
  🌐 Environment: ${process.env.NODE_ENV || 'development'}
  
  🔗 Endpoints:
     - Health: ${baseUrl}/health
     - Email test: ${baseUrl}/api/email/test?email=your@email.com
     - Email verify: ${baseUrl}/api/email/verify
  `);
});
