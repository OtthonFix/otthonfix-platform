# 🚀 FixFast Platform - Telepítési útmutató

## 📦 Mi van a csomagban?

```
fixfast/
├── public/
│   └── index.html          # Frontend (teljes UI)
├── server.js               # Backend (Node.js + Express + Socket.io)
├── package.json            # Függőségek
└── README.md              # Ez a fájl
```

---

## ⚙️ Telepítés lépésről lépésre

### 1. **Node.js telepítése** (ha még nincs)

Töltsd le: [https://nodejs.org](https://nodejs.org) (LTS verzió ajánlott)

Ellenőrizd a telepítést:
```bash
node --version
npm --version
```

### 2. **Projekt letöltése**

Hozz létre egy mappát és mentsd bele a fájlokat:
```bash
mkdir fixfast
cd fixfast
```

### 3. **package.json létrehozása**

Mentsd ezt a fájlt `package.json` néven a projekt mappába:

```json
{
  "name": "fixfast-platform",
  "version": "1.0.0",
  "description": "Budapesti szerelő platform - valós idejű párosítás",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "keywords": ["repair", "mechanic", "budapest", "platform"],
  "author": "FixFast Team",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.6.1",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### 4. **Függőségek telepítése**

```bash
npm install
```

Ez telepíti:
- ✅ **Express** - Web szerver
- ✅ **Socket.io** - Valós idejű kommunikáció
- ✅ **CORS** - Cross-origin támogatás
- ✅ **Body-parser** - JSON kezelés

### 5. **Frontend elhelyezése**

Hozz létre egy `public` mappát:
```bash
mkdir public
```

Mentsd az `index.html` fájlt ide: `public/index.html`

### 6. **Szerver indítása**

```bash
npm start
```

Vagy fejlesztői módban (auto-restart):
```bash
npm run dev
```

---

## 🌐 Használat

### Böngészőben

Nyisd meg: **http://localhost:3000**

### API tesztelés (Postman / Thunder Client)

**1. Szerelő regisztráció:**
```http
POST http://localhost:3000/api/mechanics/register
Content-Type: application/json

{
  "name": "Teszt János",
  "email": "teszt@fixfast.hu",
  "phone": "+36201234567",
  "categories": ["water", "heating"],
  "hourlyRate": 8000
}
```

**2. Szerelők listázása:**
```http
GET http://localhost:3000/api/mechanics?online=true
```

**3. Szerelő keresés (párosítás):**
```http
POST http://localhost:3000/api/match
Content-Type: application/json

{
  "category": "water",
  "description": "A csap csöpög",
  "location": {
    "lat": 47.4979,
    "lng": 19.0402
  }
}
```

**4. Státusz ellenőrzés:**
```http
GET http://localhost:3000/health
```

---

## 🔌 WebSocket használat (Frontend)

A frontend automatikusan csatlakozik, de ha manuálisan akarsz:

```javascript
const socket = io('http://localhost:3000');

// Szerelő online-ba lép
socket.emit('mechanic-online', mechanicId);

// Chat üzenet küldése
socket.emit('send-message', {
  orderId: 1,
  senderId: 123,
  senderType: 'client',
  message: 'Mikor érkezel?'
});

// Üzenet fogadása
socket.on('order-1-message', (data) => {
  console.log('Új üzenet:', data.message);
});
```

---

## 🗄️ Adatbázis

Jelenleg **in-memory** adatbázis van (újraindításkor törlődik).

### MongoDB csatlakoztatás (opcionális)

Telepítsd:
```bash
npm install mongoose
```

Kapcsolódj:
```javascript
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/fixfast');
```

### PostgreSQL használat (opcionális)

Telepítsd:
```bash
npm install pg
```

---

## 📊 Működési logika

### Párosítási algoritmus

1. **Szűrés:** Online szerelők + megfelelő kategória
2. **Távolság számítás:** Haversine formula (GPS koordináták)
3. **Pontozás:** 
   - Távolság (70%)
   - Értékelés (30%)
4. **Top 3 szerelő** visszaadása

```javascript
score = (distanceScore * 0.7) + (ratingScore * 0.3)
```

### Valós idejű események

| Esemény | Leírás |
|---------|--------|
| `mechanic-online` | Szerelő elérhető |
| `send-message` | Chat üzenet |
| `update-location` | GPS frissítés |
| `order-accepted` | Megrendelés elfogadva |

---

## 🚀 Éles környezetbe telepítés

### Heroku (ingyenes)

```bash
# Heroku CLI telepítése után
heroku create fixfast-platform
git push heroku main
```

### Render.com (ajánlott)

1. GitHub-ra feltöltés
2. Render.com → New Web Service
3. Repository csatlakoztatása
4. Build command: `npm install`
5. Start command: `npm start`

### DigitalOcean / AWS

```bash
# PM2 telepítése (process manager)
npm install -g pm2

# Szerver indítása
pm2 start server.js --name fixfast

# Auto-restart beállítás
pm2 startup
pm2 save
```

---

## 🔒 Biztonsági beállítások (éles használathoz)

### 1. Environment változók

Hozz létre `.env` fájlt:
```env
PORT=3000
NODE_ENV=production
JWT_SECRET=your-secret-key-here
DATABASE_URL=mongodb://...
```

Telepítsd:
```bash
npm install dotenv
```

Használd:
```javascript
require('dotenv').config();
const PORT = process.env.PORT || 3000;
```

### 2. Authentikáció (JWT)

```bash
npm install jsonwebtoken bcrypt
```

### 3. Rate limiting

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 perc
  max: 100 // max 100 kérés
});

app.use('/api/', limiter);
```

---

## 📱 Mobil App (opcionális)

### React Native verzió

```bash
npx react-native init FixFastMobile
```

Használd ugyanazt az API-t: `http://YOUR-SERVER/api`

---

## 🐛 Hibakeresés

### Port már használatban van

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID [PID_SZÁM] /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Socket.io nem csatlakozik

Ellenőrizd a CORS beállításokat:
```javascript
const io = socketIo(server, {
  cors: {
    origin: "*", // Vagy konkrét domain: "https://fixfast.hu"
    methods: ["GET", "POST"]
  }
});
```

### Adatbázis hiba

Ellenőrizd, hogy fut-e a MongoDB/PostgreSQL:
```bash
# MongoDB
mongod --version

# PostgreSQL
psql --version
```

---

## 📈 Továbbfejlesztési lehetőségek

### 1. **Fizetési integráció**

**Stripe:**
```bash
npm install stripe
```

```javascript
const stripe = require('stripe')('sk_test_...');

app.post('/api/payment', async (req, res) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 8000 * 100, // Ft -> fillér
    currency: 'huf'
  });
  res.json({ clientSecret: paymentIntent.client_secret });
});
```

**SimplePay (magyar):**
```bash
npm install simplepay-node
```

### 2. **SMS értesítések**

**Twilio:**
```bash
npm install twilio
```

```javascript
const twilio = require('twilio')(accountSid, authToken);

await twilio.messages.create({
  body: 'Kovács János szerelő 10 perc múlva érkezik!',
  from: '+36...',
  to: client.phone
});
```

### 3. **Email értesítések**

**NodeMailer:**
```bash
npm install nodemailer
```

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'fixfast@gmail.com',
    pass: 'your-password'
  }
});

await transporter.sendMail({
  from: 'fixfast@gmail.com',
  to: mechanic.email,
  subject: 'Új megrendelés!',
  html: '<h1>Új ügyfél keresi szolgáltatásod</h1>'
});
```

### 4. **Képfeltöltés**

**Multer (fájl upload):**
```bash
npm install multer
```

```javascript
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

app.post('/api/upload', upload.single('photo'), (req, res) => {
  res.json({ filename: req.file.filename });
});
```

### 5. **Push notifikációk**

**Firebase Cloud Messaging:**
```bash
npm install firebase-admin
```

```javascript
const admin = require('firebase-admin');

admin.messaging().send({
  token: deviceToken,
  notification: {
    title: 'Új üzenet!',
    body: 'Kovács János válaszolt'
  }
});
```

### 6. **Admin Dashboard**

Készíts admin felületet:
- Összes szerelő/ügyfél kezelése
- Statisztikák (napi megrendelések, bevétel)
- Értékelések moderálása
- Fraud detection

### 7. **Analitika**

**Google Analytics:**
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
```

**Saját statisztika:**
```javascript
app.use((req, res, next) => {
  database.analytics.push({
    method: req.method,
    url: req.url,
    timestamp: new Date()
  });
  next();
});
```

---

## 🎯 Ajánlott tech stack éles használathoz

| Komponens | Ajánlott technológia |
|-----------|---------------------|
| **Frontend** | React / Next.js |
| **Backend** | Node.js + Express |
| **Adatbázis** | PostgreSQL / MongoDB |
| **Cache** | Redis |
| **WebSocket** | Socket.io |
| **File Storage** | AWS S3 / Cloudinary |
| **Hosting** | Render.com / Railway |
| **CDN** | Cloudflare |
| **Monitoring** | Sentry |
| **Logs** | Winston / Morgan |

---

## 🔍 Tesztelés

### Unit tesztek (Jest)

```bash
npm install --save-dev jest supertest
```

```javascript
// server.test.js
const request = require('supertest');
const app = require('./server');

test('GET /health visszaad OK státuszt', async () => {
  const response = await request(app).get('/health');
  expect(response.status).toBe(200);
  expect(response.body.status).toBe('OK');
});

test('POST /api/match találat megfelelő szerelőt', async () => {
  const response = await request(app)
    .post('/api/match')
    .send({
      category: 'water',
      description: 'Csöpög a csap'
    });
  
  expect(response.status).toBe(200);
  expect(response.body.mechanics.length).toBeGreaterThan(0);
});
```

Futtatás:
```bash
npm test
```

---

## 📞 Support & Contributing

### Hibák bejelentése

GitHub Issues: `https://github.com/fixfast/platform/issues`

### Hozzájárulás

1. Fork-old a repo-t
2. Hozz létre feature branch-et: `git checkout -b feature/new-feature`
3. Commit: `git commit -m 'Add new feature'`
4. Push: `git push origin feature/new-feature`
5. Pull Request

---

## 📄 Licenc

MIT License - Szabadon használható, módosítható, terjeszthető.

---

## 🎉 Sikeres indítás checklist

- [ ] Node.js telepítve
- [ ] `npm install` lefutott
- [ ] Backend elindul (`npm start`)
- [ ] Frontend elérhető (`http://localhost:3000`)
- [ ] API működik (Postman teszt)
- [ ] WebSocket csatlakozik
- [ ] Párosítási logika működik
- [ ] Chat funkció megy

---

## 🚀 Következő lépések

1. **Regisztrálj néhány teszt szerelőt** az API-n keresztül
2. **Állíts be néhány szerelőt online-ra**
3. **Indíts egy keresést** az ügyfél felületről
4. **Teszteld a chat funkciót**
5. **Nézd meg a health endpoint-ot** a statisztikáért

---

## 💡 Tippek

- Használj **nodemon**-t fejlesztéshez (auto-restart)
- **PM2**-vel futtasd éles környezetben
- Állíts be **HTTPS**-t Let's Encrypt-tel
- Használj **environment változókat** érzékeny adatokhoz
- Készíts **backup**-ot az adatbázisról naponta
- **Rate limiting** API védelmére
- **Input validation** minden végponton
- **Error logging** Sentry-vel

---

## 📚 További dokumentáció

- Express.js: https://expressjs.com
- Socket.io: https://socket.io
- MongoDB: https://www.mongodb.com/docs
- PostgreSQL: https://www.postgresql.org/docs

---

**Minden kész! Indítsd el a szervert és hajrá! 🚀**

Ha bármilyen kérdésed van, nézd meg a FAQ részt vagy nyiss egy issue-t a GitHub-on.

**Jó munkát! 💪**