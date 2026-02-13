// middleware/auth.js
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Nincs jogosultság, jelentkezz be!' });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'Felhasználó nem található' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Érvénytelen token' });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Nincs jogosultságod' });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
