// routes/auth.js - Autentikációs route-ok
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { protect } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('A név megadása kötelező'),
  body('email').isEmail().withMessage('Érvényes email cím szükséges'),
  body('phone').trim().notEmpty().withMessage('A telefonszám megadása kötelező'),
  body('password').isLength({ min: 6 }).withMessage('A jelszó legalább 6 karakter hosszú kell legyen'),
  body('role').isIn(['client', 'mechanic']).withMessage('Érvénytelen role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, password, role, categories, hourlyRate, location } = req.body;

    // Email unique ellenőrzés
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Ez az email cím már regisztrálva van' });
    }

    // Mechanic validáció
    if (role === 'mechanic' && (!categories || categories.length === 0)) {
      return res.status(400).json({ error: 'A szerelőknek legalább egy kategóriát választaniuk kell' });
    }

    // Activation token
    const activationToken = require('crypto').randomBytes(32).toString('hex');

    // User létrehozása
    const userData = {
      name,
      email,
      phone,
      password,
      role,
      activationToken,
      isActive: true,
      isVerified: true
    };

    if (role === 'mechanic') {
      userData.categories = categories;
      userData.hourlyRate = hourlyRate || 5000;
      userData.location = location || { lat: 47.4979, lng: 19.0402 };
    }

    const user = await User.create(userData);

    // Token generálás
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Regisztráció sikeres!',
      token,
      user: user.toPublicJSON()
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      error: 'Regisztrációs hiba történt',
      details: error.message 
    });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().withMessage('Érvényes email cím szükséges'),
  body('password').notEmpty().withMessage('A jelszó megadása kötelező')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // User lekérése password-del
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ error: 'Helytelen email vagy jelszó' });
    }

    // Password ellenőrzés
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({ error: 'Helytelen email vagy jelszó' });
    }

    // Token generálás
    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'Sikeres bejelentkezés!',
      token,
      user: user.toPublicJSON()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Bejelentkezési hiba történt',
      details: error.message 
    });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user.toPublicJSON()
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Hiba történt' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Sikeres kijelentkezés'
  });
});

module.exports = router;