const validator = require('validator');

function validateEmail(email) {
  return validator.isEmail(email);
}

function sanitizeEmail(email) {
  return validator.normalizeEmail(email);
}

module.exports = { validateEmail, sanitizeEmail };