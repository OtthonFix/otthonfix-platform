// services/emailService.js
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@otthonfix.com';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const categoryNames = { water: 'Vízszerelés', electric: 'Villanyszerelés', heating: 'Fűtésszerelés', locksmith: 'Zárcsere' };
const categoryIcons = { water: '💧', electric: '⚡', heating: '🔥', locksmith: '🔐' };

async function sendEmail({ to, subject, html, text }) {
  if (!SENDGRID_API_KEY) {
    console.log('⚠️ SENDGRID_API_KEY nincs beállítva, email nem küldve');
    return { success: false, error: 'API key hiányzik' };
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: SUPPORT_EMAIL, name: 'OtthonFix' },
        subject,
        content: [
          { type: 'text/plain', value: text || subject },
          { type: 'text/html', value: html }
        ]
      })
    });

    if (response.ok || response.status === 202) {
      console.log(`✅ Email elküldve: ${to}`);
      return { success: true };
    } else {
      const errorText = await response.text();
      console.error(`❌ SendGrid hiba:`, errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('❌ Email hiba:', error.message);
    return { success: false, error: error.message };
  }
}

async function sendNewJobNotification(mechanic, job) {
  const catName = categoryNames[job.category] || job.category;
  const catIcon = categoryIcons[job.category] || '🔧';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#f97316,#ea580c);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;font-weight:700;">🔔 Új Munka Érkezett!</h1>
    </div>
    <div style="background:white;padding:32px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size:16px;color:#1f2937;margin-bottom:24px;">Kedves <strong>${mechanic.name}</strong>,</p>
      <div style="background:#fef7ed;border:1px solid #fed7aa;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="font-size:20px;margin-bottom:12px;">${catIcon} <strong style="color:#ea580c;">${catName}</strong></div>
        <div style="color:#6b7280;margin-bottom:8px;">📍 <strong>Helyszín:</strong> ${job.district}, ${job.street}${job.houseNumber ? ' ' + job.houseNumber : ''}</div>
        <div style="color:#374151;margin-top:12px;"><strong>Leírás:</strong><br>${job.description}</div>
      </div>
      <div style="text-align:center;">
        <a href="${BASE_URL}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:16px;">Munka megtekintése</a>
      </div>
      <p style="color:#9ca3af;font-size:14px;text-align:center;margin-top:24px;">Gyors válaszadással növelheted az esélyeidet!</p>
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:20px;">OtthonFix - Budapesti Szerelő Platform</p>
  </div>
</body>
</html>`;

  return sendEmail({
    to: mechanic.email,
    subject: `🔔 Új ${catName} munka: ${job.district}`,
    html,
    text: `Új munka: ${catName} - ${job.district}, ${job.street}`
  });
}

async function sendJobAcceptedNotification(job, mechanic) {
  const catName = categoryNames[job.category] || job.category;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#10b981,#059669);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;font-weight:700;">✅ Szerelő Jelentkezett!</h1>
    </div>
    <div style="background:white;padding:32px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size:16px;color:#1f2937;margin-bottom:24px;">Kedves <strong>${job.clientName}</strong>,</p>
      <p style="color:#4b5563;margin-bottom:24px;"><strong>${mechanic.name}</strong> elfogadta a munkádat!</p>
      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="font-weight:600;font-size:18px;color:#1f2937;margin-bottom:12px;">${mechanic.name}</div>
        <div style="color:#6b7280;">⭐ ${mechanic.rating?.toFixed(1) || '5.0'} (${mechanic.reviews || 0} értékelés)</div>
        <div style="margin-top:12px;">
          <div>📞 <a href="tel:${mechanic.phone}" style="color:#2563eb;">${mechanic.phone}</a></div>
          <div>✉️ <a href="mailto:${mechanic.email}" style="color:#2563eb;">${mechanic.email}</a></div>
        </div>
      </div>
      <div style="text-align:center;">
        <a href="${BASE_URL}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;">Munka követése</a>
      </div>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: job.clientEmail,
    subject: `✅ ${mechanic.name} elfogadta a munkádat!`,
    html,
    text: `${mechanic.name} elfogadta a munkádat. Telefon: ${mechanic.phone}`
  });
}

async function sendRegistrationConfirmation(user) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#f97316,#2563eb);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
      <h1 style="color:white;margin:0;">🎉 Üdvözlünk az OtthonFix-nél!</h1>
    </div>
    <div style="background:white;padding:32px;border-radius:0 0 16px 16px;">
      <p style="font-size:16px;color:#1f2937;">Kedves <strong>${user.name}</strong>,</p>
      <p style="color:#4b5563;">Sikeresen regisztráltál az OtthonFix platformra!</p>
      <div style="text-align:center;margin-top:24px;">
        <a href="${BASE_URL}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;">Kezdjük el!</a>
      </div>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: user.email,
    subject: '🎉 Üdvözlünk az OtthonFix-nél!',
    html,
    text: `Kedves ${user.name}! Sikeresen regisztráltál.`
  });
}

async function sendTest(email) {
  return sendEmail({
    to: email,
    subject: '✅ OtthonFix Teszt Email',
    html: `<div style="font-family:sans-serif;padding:20px;"><h1 style="color:#f97316;">🔧 OtthonFix</h1><p>Teszt email - működik! ✅</p></div>`,
    text: 'OtthonFix teszt - működik!'
  });
}

async function verifyConnection() {
  return !!SENDGRID_API_KEY;
}

module.exports = { sendEmail, sendNewJobNotification, sendJobAcceptedNotification, sendRegistrationConfirmation, sendTest, verifyConnection };
