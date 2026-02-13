# 🔧 OtthonFix - Telepítési Útmutató

## Gyors áttekintés
OtthonFix - Budapesti szerelő platform (vízszerelés, villanyszerelés, fűtésszerelés, zárcsere)

## Fájlstruktúra
```
otthonfix/
├── config/database.js      # MongoDB kapcsolat
├── middleware/auth.js      # JWT autentikáció
├── models/
│   ├── User.js             # Felhasználók (areas mező!)
│   ├── Job.js              # Munkák
│   ├── Invoice.js          # Számlák (10% jutalék)
│   └── Message.js          # Chat
├── routes/
│   ├── auth.js             # Login/Register
│   ├── jobs.js             # Munkák + email értesítés
│   ├── invoices.js         # Számlák
│   ├── admin.js            # Admin dashboard
│   └── messages.js         # Chat
├── services/emailService.js # SendGrid email
├── public/index.html        # Teljes frontend
├── server.js                # Fő szerver
└── package.json
```

---

## 1. Előfeltételek
- **Node.js 18+**: https://nodejs.org
- **MongoDB Atlas**: https://mongodb.com/atlas (ingyenes)
- **SendGrid**: https://sendgrid.com (opcionális, email értesítéshez)

---

## 2. Telepítés

```bash
# 1. Csomagold ki a ZIP-et
unzip otthonfix.zip
cd otthonfix

# 2. Függőségek
npm install

# 3. Környezeti változók
cp .env.example .env
# Szerkeszd a .env fájlt!

# 4. Indítás
npm start
```

Böngészőben: **http://localhost:3000**

---

## 3. .env beállítás

```env
PORT=3000
BASE_URL=http://localhost:3000

# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/otthonfix

# JWT (min. 32 karakter random string)
JWT_SECRET=valami-nagyon-hosszu-titkos-kulcs-123
JWT_EXPIRES_IN=7d

# SendGrid (opcionális)
SENDGRID_API_KEY=SG.xxxxx
SUPPORT_EMAIL=support@otthonfix.com
```

---

## 4. MongoDB Atlas beállítás

1. Regisztrálj: https://mongodb.com/atlas
2. "Build a Database" → FREE (M0)
3. Database Access → Add User (jelszó mentése!)
4. Network Access → Allow Access from Anywhere
5. Cluster → Connect → Drivers → Másold a connection string-et
6. Cseréld ki: `<password>` → valódi jelszó

---

## 5. Admin fiók létrehozása

MongoDB Compass-ban vagy Atlas Data Explorer-ben:
1. Nyisd meg: `otthonfix` → `users` collection
2. Insert Document:

```json
{
  "name": "Admin",
  "email": "admin@otthonfix.com",
  "phone": "+36301234567",
  "password": "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4UjKlPqXlFGz5Iau",
  "role": "admin",
  "isActive": true,
  "isVerified": true,
  "createdAt": { "$date": "2024-01-01T00:00:00Z" }
}
```

**Bejelentkezés:** admin@otthonfix.com / admin123456

---

## 6. Élesítés

### Railway.app (legegyszerűbb)
1. https://railway.app → GitHub login
2. New Project → Deploy from GitHub
3. Variables → add .env változók
4. Settings → Generate Domain

### Render.com
1. https://render.com → New Web Service
2. Build: `npm install`
3. Start: `npm start`
4. Environment Variables hozzáadása

### VPS (PM2)
```bash
npm install -g pm2
pm2 start server.js --name otthonfix
pm2 save && pm2 startup
```

---

## 7. API Végpontok

| Endpoint | Leírás |
|----------|--------|
| POST /api/auth/register | Regisztráció |
| POST /api/auth/login | Bejelentkezés |
| GET /api/jobs | Munkák listázása |
| POST /api/jobs | Új munka (+ email értesítés) |
| POST /api/jobs/:id/accept | Munka elfogadása |
| PUT /api/jobs/:id/status | Státusz módosítás |
| POST /api/invoices | Számla feltöltés |
| GET /api/admin/dashboard | Admin statisztikák |

---

## 8. Funkciók

✅ Ügyfél/Szerelő/Admin regisztráció  
✅ Kerület alapú munkakiosztás (23 budapesti kerület)  
✅ Automatikus email értesítés szerelőknek  
✅ Munka státusz követés  
✅ Számla feltöltés + 10% platform jutalék  
✅ Értékelési rendszer  
✅ Reszponzív dizájn (mobil + desktop)  
✅ Admin dashboard  

---

## 9. Tesztelés

```bash
# Health check
curl http://localhost:3000/health

# Email teszt (ha van SendGrid)
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## Kész! 🎉

Ha kérdésed van, nyiss issue-t vagy írj!
