

// emailService.js - Automatikus Fallback (iCloud → Gmail)

const nodemailer = require('nodemailer');

// Email templates
const emailTemplates = {
  reg_confirmation: {
    subject: "Üdv a {{company_name}}-nál! Aktiváld a fiókod",
    html: `<div style="font-family:Arial;color:#0A2540;padding:20px;max-width:600px;margin:0 auto;">
      <h2 style="color:#F5B93C;">Köszönjük, hogy regisztráltál, {{first_name}}!</h2>
      <p>Kérjük, aktiváld a fiókodat:</p>
      <div style="text-align:center;margin:20px 0;">
        <a href="{{action_url}}" style="display:inline-block;padding:14px 28px;background:#F5B93C;color:#000;text-decoration:none;border-radius:8px;font-weight:bold;">Fiók aktiválása</a>
      </div>
      <p style="color:#666;">Kérdés: <a href="mailto:{{support_email}}">{{support_email}}</a></p>
    </div>`,
    text: `Kedves {{first_name}}!\n\nAktiváld a fiókod: {{action_url}}\n\nÜdv, {{company_name}}`
  },
  
  onboarding: {
    subject: "Hogyan működik a {{company_name}} — 3 perc és kész",
    html: `<div style="font-family:Arial;color:#0A2540;padding:20px;max-width:600px;margin:0 auto;">
      <h3>Üdv a {{company_name}}-nál, {{first_name}}!</h3>
      <p>Íme 3 gyors lépés:</p>
      <ol style="line-height:2;">
        <li>Töltsd ki a profilod</li>
        <li>Állítsd be az elérhetőséged</li>
        <li>Engedélyezd az értesítéseket</li>
      </ol>
      <div style="text-align:center;margin:20px 0;">
        <a href="{{action_url}}" style="background:#F5B93C;padding:12px 24px;color:#000;text-decoration:none;border-radius:6px;display:inline-block;">Profil befejezése</a>
      </div>
    </div>`,
    text: `Szia {{first_name}},\n\nÜdv!\n\nProfil: {{action_url}}`
  },

  order_confirmation_customer: {
    subject: "Megrendelésed rögzítve – {{job_id}}",
    html: `<div style="font-family:Arial;color:#0A2540;padding:20px;max-width:600px;margin:0 auto;">
      <h3>Megrendelésed rögzítve ({{job_id}})</h3>
      <p>Várható érkezés: <strong>{{eta}}</strong></p>
      <p style="margin:20px 0;">
        <a href="{{tracking_url}}" style="background:#3DA9FC;padding:10px 20px;color:#fff;text-decoration:none;border-radius:6px;display:inline-block;">Állapot követése</a>
      </p>
    </div>`,
    text: `Megrendelés: {{job_id}}\nÉrkezés: {{eta}}\nÁllapot: {{tracking_url}}`
  },

  new_job_notification_tech: {
    subject: "Új megrendelés — {{category}} ({{job_id}})",
    html: `<div style="font-family:Arial;color:#0A2540;padding:20px;max-width:600px;margin:0 auto;">
      <h3>Új megrendelés ({{job_id}})</h3>
      <p><strong>Cím:</strong> {{address}}<br/><strong>Leírás:</strong> {{job_title}}</p>
      <div style="margin:20px 0;">
        <a href="{{accept_url}}" style="background:#F5B93C;padding:10px 16px;color:#000;text-decoration:none;border-radius:6px;margin-right:10px;display:inline-block;">Elfogadom</a>
        <a href="{{decline_url}}" style="background:#ccc;padding:10px 16px;color:#000;text-decoration:none;border-radius:6px;display:inline-block;">Elutasítom</a>
      </div>
    </div>`,
    text: `{{first_name}}, új munka!\nCím: {{address}}\nLeírás: {{job_title}}\n\nElfogadom: {{accept_url}}`
  },

  job_accepted_confirmation: {
    subject: "Szerelő úton van — {{technician_name}} ({{eta}})",
    html: `<div style="font-family:Arial;color:#0A2540;padding:20px;max-width:600px;margin:0 auto;">
      <h3>Összekapcsoltunk a szerelővel</h3>
      <p><strong>{{technician_name}}</strong><br/>
      <a href="{{technician_profile_url}}">Profil megnézése</a></p>
      <p>Várható érkezés: <strong>{{eta}}</strong></p>
    </div>`,
    text: `Összekapcsoltunk:\nNév: {{technician_name}}\nÉrkezés: {{eta}}`
  },

  job_completed_invoice: {
    subject: "Munka lezárva — számla ({{job_id}})",
    html: `<div style="font-family:Arial;color:#0A2540;padding:20px;max-width:600px;margin:0 auto;">
      <h3>Munka lezárva ({{job_id}})</h3>
      <p>Számla: <a href="{{invoice_url}}">Megnyitás / Letöltés</a></p>
      <p style="margin:20px 0;">
        <a href="{{rating_url}}" style="background:#3DA9FC;padding:10px 16px;color:#fff;text-decoration:none;border-radius:6px;display:inline-block;">Értékelem a munkát</a>
      </p>
    </div>`,
    text: `Munka lezárva: {{job_id}}\nSzámla: {{invoice_url}}`
  },

  rating_request: {
    subject: "Hogy sikerült a munka?",
    html: `<div style="font-family:Arial;color:#0A2540;padding:20px;max-width:600px;margin:0 auto;">
      <h3>Kérjük, értékeld a szolgáltatást</h3>
      <p style="margin:20px 0;">
        <a href="{{rating_url}}" style="background:#F5B93C;padding:12px 24px;color:#000;text-decoration:none;border-radius:6px;display:inline-block;">Értékelem (1-5 csillag)</a>
      </p>
    </div>`,
    text: `Értékeld a munkát: {{rating_url}}`
  }
};

class EmailService {
  constructor() {
    // Email providers konfigurációja
    this.providers = {
      icloud: {
        host: process.env.ICLOUD_HOST || 'smtp.mail.me.com',
        port: parseInt(process.env.ICLOUD_PORT) || 587,
        secure: parseInt(process.env.ICLOUD_PORT) === 465,
        auth: {
          user: process.env.ICLOUD_USER,
          pass: process.env.ICLOUD_PASS
        },
        tls: { rejectUnauthorized: false }
      },
      gmail: {
        host: process.env.GMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.GMAIL_PORT) || 587,
        secure: parseInt(process.env.GMAIL_PORT) === 465,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS
        },
        tls: { rejectUnauthorized: false }
      }
    };

    // Elsődleges és másodlagos provider
    this.primaryProvider = process.env.EMAIL_PROVIDER || 'icloud';
    this.secondaryProvider = this.primaryProvider === 'icloud' ? 'gmail' : 'icloud';

    // Transporterek létrehozása
    this.transporters = {};
    
    Object.keys(this.providers).forEach(provider => {
      if (this.providers[provider].auth.user && this.providers[provider].auth.pass) {
        this.transporters[provider] = nodemailer.createTransport(this.providers[provider]);
      }
    });

    this.config = {
      company_name: 'OtthonFix',
      support_email: process.env.SUPPORT_EMAIL || 'support@otthonfix.com',
      base_url: process.env.BASE_URL || 'http://localhost:3000'
    };

    console.log('📧 Email Service initialized (Fallback Mode)');
    console.log(`   Primary: ${this.primaryProvider.toUpperCase()}`);
    console.log(`   Fallback: ${this.secondaryProvider.toUpperCase()}`);
    console.log(`   Configured: ${Object.keys(this.transporters).join(', ')}`);
  }

  replacePlaceholders(template, data) {
    let result = template;
    const allData = { ...this.config, ...data };
    
    Object.keys(allData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, allData[key] || '');
    });
    
    return result;
  }

  async send(templateId, recipientEmail, data = {}) {
    const template = emailTemplates[templateId];
    
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const subject = this.replacePlaceholders(template.subject, data);
    const html = this.replacePlaceholders(template.html, data);
    const text = this.replacePlaceholders(template.text, data);

    const mailOptions = {
      to: recipientEmail,
      subject: subject,
      html: html,
      text: text
    };

    // Próbáld meg az elsődleges providerrel
    try {
      const transporter = this.transporters[this.primaryProvider];
      
      if (!transporter) {
        throw new Error(`Primary provider (${this.primaryProvider}) not configured`);
      }

      mailOptions.from = `${this.config.company_name} <${this.providers[this.primaryProvider].auth.user}>`;
      
      const info = await transporter.sendMail(mailOptions);
      
      console.log(`✅ Email sent via ${this.primaryProvider.toUpperCase()}: ${templateId} → ${recipientEmail}`);
      console.log(`   Message ID: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
        provider: this.primaryProvider,
        template: templateId,
        recipient: recipientEmail
      };
    } catch (primaryError) {
      console.warn(`⚠️ Primary provider (${this.primaryProvider}) failed: ${primaryError.message}`);
      
      // Próbáld meg a másodlagos providerrel
      try {
        const transporter = this.transporters[this.secondaryProvider];
        
        if (!transporter) {
          throw new Error(`Secondary provider (${this.secondaryProvider}) not configured`);
        }

        mailOptions.from = `${this.config.company_name} <${this.providers[this.primaryProvider].auth.user}>`;
        
        const info = await transporter.sendMail(mailOptions);
        
        console.log(`✅ Email sent via ${this.secondaryProvider.toUpperCase()} (fallback): ${templateId} → ${recipientEmail}`);
        console.log(`   Message ID: ${info.messageId}`);
        
        return {
          success: true,
          messageId: info.messageId,
          provider: this.secondaryProvider,
          fallback: true,
          template: templateId,
          recipient: recipientEmail
        };
      } catch (secondaryError) {
        console.error(`❌ Both providers failed!`);
        console.error(`   Primary (${this.primaryProvider}): ${primaryError.message}`);
        console.error(`   Secondary (${this.secondaryProvider}): ${secondaryError.message}`);
        
        return {
          success: false,
          error: `All providers failed. Last error: ${secondaryError.message}`,
          template: templateId,
          recipient: recipientEmail
        };
      }
    }
  }

  async sendRegistrationConfirmation(user) {
    return this.send('reg_confirmation', user.email, {
      first_name: user.name.split(' ')[0],
      action_url: `${this.config.base_url}/activate?token=${user.activationToken}`
    });
  }

  async sendOnboarding(user) {
    return this.send('onboarding', user.email, {
      first_name: user.name.split(' ')[0],
      action_url: `${this.config.base_url}/profile/complete`
    });
  }

  async sendOrderConfirmation(order, customer) {
    return this.send('order_confirmation_customer', customer.email, {
      first_name: customer.name.split(' ')[0],
      job_id: order.id,
      eta: order.estimatedArrival || '30 perc',
      tracking_url: `${this.config.base_url}/orders/${order.id}/track`
    });
  }

  async sendNewJobNotification(job, mechanic) {
    return this.send('new_job_notification_tech', mechanic.email, {
      first_name: mechanic.name.split(' ')[0],
      job_id: job.id,
      category: job.category,
      address: job.address || 'Budapest',
      job_title: job.description,
      accept_url: `${this.config.base_url}/jobs/${job.id}/accept`,
      decline_url: `${this.config.base_url}/jobs/${job.id}/decline`
    });
  }

  async sendMatchConfirmation(order, customer, mechanic) {
    return this.send('job_accepted_confirmation', customer.email, {
      first_name: customer.name.split(' ')[0],
      technician_name: mechanic.name,
      technician_profile_url: `${this.config.base_url}/mechanics/${mechanic.id}`,
      eta: order.estimatedArrival || '15 perc'
    });
  }

  async sendJobCompleted(order, customer) {
    return this.send('job_completed_invoice', customer.email, {
      first_name: customer.name.split(' ')[0],
      job_id: order.id,
      invoice_url: `${this.config.base_url}/invoices/${order.invoiceId}`,
      rating_url: `${this.config.base_url}/rate/${order.id}`
    });
  }

  async sendRatingRequest(order, customer) {
    return this.send('rating_request', customer.email, {
      first_name: customer.name.split(' ')[0],
      rating_url: `${this.config.base_url}/rate/${order.id}`
    });
  }

  async sendTest(recipientEmail) {
    return this.send('reg_confirmation', recipientEmail, {
      first_name: 'Teszt',
      action_url: `${this.config.base_url}/test`
    });
  }

  async verifyConnection(provider) {
    try {
      const transporter = this.transporters[provider];
      if (!transporter) {
        throw new Error(`Provider ${provider} not configured`);
      }
      await transporter.verify();
      console.log(`✅ ${provider.toUpperCase()} connection verified`);
      return true;
    } catch (error) {
      console.error(`❌ ${provider.toUpperCase()} connection failed: ${error.message}`);
      return false;
    }
  }
}

module.exports = new EmailService();