const nodemailer = require('nodemailer');

let transporter;

async function initialize() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) { console.warn('⚠️ SMTP nincs beállítva'); transporter = null; return; }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: false,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });

  try { if (transporter.verify) await transporter.verify(); console.log('✅ Email transporter kész'); }
  catch (e) { console.error('❌ Email verify hiba:', e.message); }
}

function fromHeader() {
  const name = process.env.FROM_NAME || 'OtthonFix';
  const email = process.env.FROM_EMAIL || 'no-reply@example.com';
  return `"${name}" <${email}>`;
}

async function sendEmail({ to, subject, html, text, attachments = [] }) {
  if (!transporter) throw new Error('Email transporter nincs inicializálva');
  return transporter.sendMail({ from: fromHeader(), to, subject, html, text, attachments });
}

async function sendRegistrationConfirmation(mechanic, token) {
  if (!transporter) return;
  const to = mechanic?.email || process.env.FROM_EMAIL;
  const html = `<h3>Sikeres regisztráció</h3><p>Token: <b>${token}</b></p>`;
  return transporter.sendMail({ from: fromHeader(), to, subject: 'Regisztráció megerősítése', html });
}

async function sendOrderConfirmation(order, customer, options = {}) {
  if (!transporter) return;
  const { attachments = [] } = options;
  const to = customer?.email || process.env.FROM_EMAIL;
  const html = `<h3>Rendelés visszaigazolás – ${order.id}</h3><p>A munkalapot csatoltuk.</p>`;
  return transporter.sendMail({ from: fromHeader(), to, subject: `Rendelés – ${order.id}`, html, attachments });
}

async function sendNewJobAlert(orderSummary, mechanic) {
  if (!transporter) return;
  const to = mechanic?.email || process.env.FROM_EMAIL;
  const html = `<h3>Új munka – ${orderSummary.id}</h3>`;
  return transporter.sendMail({ from: fromHeader(), to, subject: `Új munka – ${orderSummary.id}`, html });
}

module.exports = {
  initialize,
  sendEmail,                    // <- EZ KELL A TESZTHEZ
  sendRegistrationConfirmation,
  sendOrderConfirmation,
  sendNewJobAlert,
};
