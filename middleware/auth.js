// middleware/auth.js - Autentikációs middleware
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

// Védett route-okhoz
const protect = async (req, res, next) => {
  try {
    let token;

    // Token kinyerése header-ből
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ 
        error: 'Nincs jogosultságod, kérlek jelentkezz be!' 
      });
    }

    // Token verify
    const decoded = verifyToken(token);

    // User lekérése
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ 
        error: 'A felhasználó nem található' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ 
      error: 'Érvénytelen vagy lejárt token' 
    });
  }
};

// Role-alapú védelem
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Nincs jogosultságod ehhez a művelethez' 
      });
    }
    next();
  };
};

module.exports = {
  protect,
  restrictTo
};