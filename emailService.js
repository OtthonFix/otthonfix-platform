// emailService.js - SendGrid Email Service
const sgMail = require('@sendgrid/mail');

// Tisztítás: CR/LF/TAB karakterek eltávolítása
function cleanApiKey(key) {
  if (!key) return key;
  const cleaned = key.replace(/[\r\n\t]/g, '');
  if (cleaned !== key) {
    console.warn('⚠️ SENDGRID_API_KEY tartalmazott vezérlőkaraktert (CR/LF/TAB). Tisztítva lett.');
  }
  return cleaned;
}

const apiKey = cleanApiKey(process.env.SENDGRID_API_KEY);
sgMail.setApiKey(apiKey);

const FROM_EMAIL = process.env.FROM_EMAIL || 'support@otthonfix.com';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

console.log('📧 Email Service initialized (SendGrid REST API)');
console.log(` From: ${FROM_EMAIL}`);
console.log(` Base URL: ${BASE_URL}`);

// Test email
async function sendTest(toEmail) {
  try {
    const msg = {
      to: toEmail,
      from: FROM_EMAIL,
      subject: 'OtthonFix - Teszt Email',
      text: 'Ez egy teszt email az OtthonFix platformról.',
      html: '<strong>Ez egy teszt email az OtthonFix platformról.</strong>',
    };

    await sgMail.send(msg);
    return { success: true, message: 'Email sikeresen elküldve' };
  } catch (error) {
    console.error('Email küldési hiba:', error);
    return { success: false, error: error.message };
  }
}

// Registration confirmation
async function sendRegistrationConfirmation(user) {
  try {
    const activationUrl = `${BASE_URL}/api/auth/activate/${user.activationToken}`;
    
    const msg = {
      to: user.email,
      from: FROM_EMAIL,
      subject: 'OtthonFix - Regisztráció megerősítése',
      text: `Üdvözlünk az OtthonFix platformon!\n\nKattints a linkre a fiók aktiválásához: ${activationUrl}`,
      html: `
        <h2>Üdvözlünk az OtthonFix platformon!</h2>
        <p>Szia ${user.name}!</p>
        <p>Köszönjük a regisztrációt. Kattints az alábbi linkre a fiókod aktiválásához:</p>
        <a href="${activationUrl}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; display: inline-block;">Fiók aktiválása</a>
        <p>Vagy másold be ezt a linket a böngésződbe:</p>
        <p>${activationUrl}</p>
        <br>
        <p>Üdvözlettel,<br>Az OtthonFix csapata</p>
      `,
    };

    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('Registration email hiba:', error);
    return { success: false, error: error.message };
  }
}

// Order confirmation
async function sendOrderConfirmation(order, mechanic) {
  try {
    const msg = {
      to: order.customerEmail,
      from: FROM_EMAIL,
      subject: 'OtthonFix - Megrendelés visszaigazolás',
      text: `A megrendelésed visszaigazolva!\n\nSzerelő: ${mechanic.name}\nKategória: ${order.category}\nBecsült érkezés: ${order.estimatedArrival}`,
      html: `
        <h2>Megrendelésed visszaigazolva!</h2>
        <p>Szia ${order.customerName}!</p>
        <p><strong>Szerelő:</strong> ${mechanic.name}</p>
        <p><strong>Kategória:</strong> ${order.category}</p>
        <p><strong>Becsült érkezés:</strong> ${order.estimatedArrival}</p>
        <p><strong>Megrendelés ID:</strong> ${order.orderId}</p>
        <br>
        <p>Üdvözlettel,<br>Az OtthonFix csapata</p>
      `,
    };

    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('Order email hiba:', error);
    return { success: false, error: error.message };
  }
}

// Verify connection
async function verifyConnection() {
  try {
    await sgMail.send({
      to: FROM_EMAIL,
      from: FROM_EMAIL,
      subject: 'SendGrid Connection Test',
      text: 'Connection OK',
    });
    return true;
  } catch (error) {
    console.error('SendGrid connection failed:', error);
    return false;
  }
}

module.exports = {
  sendTest,
  sendRegistrationConfirmation,
  sendOrderConfirmation,
  verifyConnection
};