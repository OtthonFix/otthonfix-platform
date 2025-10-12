// emailService.js - Automatikus Fallback (SendGrid → Gmail → iCloud)

const nodemailer = require('nodemailer');

// Email templates
const emailTemplates = {
  reg_confirmation: {
    subject: "Üdv a {{company_name}}-nál! Aktiváld a fiókodat",
    html: `<div style="font-family:Arial;color:#0A2540;padding:20px;max-width:600px;margin:0 auto;">
      <h2 style="color:#F5B93C;">Köszönjük, hogy regisztráltál, {{first_name}}!</h2>
      <p>Kérjük, aktiváld a fiókodat:</p>
      <div style="text-align:center;margin:20px 0;">
        <a href="{{action_url}}" style="display:inline-block;padding:14px 28px;background:#F5B93C;color:#000;text-decoration:none;border-radius:8px;font-weight:bold;">Fiók aktiválása</a>
      </div>
      <p style="color:#666;">Kérdés: <a href="mailto:{{support_email}}">{{support_email}}</a></p>
    </div>`,
    text: `Kedves {{first_name}}!\n\nAktiváld a fiókodat: {{action_url}}\n\nÜdv, {{company_name}}`
  },
  
  test: {
    subject: "OtthonFix - Email Teszt",
    html: `<div style="font-family:Arial;color:#0A2540;padding:20px;max-width:600px;margin:0 auto;">
      <h3>Email Teszt</h3>
      <p>{{message}}</p>
      <p style="color:#666;">Ez egy teszt email az OtthonFix rendszerből.</p>
    </div>`,
    text: `Email Teszt\n\n{{message}}`
  }
};

class EmailService {
  constructor() {
    // Email providers konfigurációja
    this.providers = {
      sendgrid: {
        host: process.env.SENDGRID_HOST || 'smtp.sendgrid.net',
        port: parseInt(process.env.SENDGRID_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SENDGRID_USER || 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      },
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
    this.primaryProvider = process.env.EMAIL_PROVIDER || 'sendgrid';
    this.secondaryProvider = this.primaryProvider === 'sendgrid' ? 'gmail' : 
                            this.primaryProvider === 'icloud' ? 'gmail' : 'sendgrid';

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

        mailOptions.from = `${this.config.company_name} <${this.providers[this.secondaryProvider].auth.user}>`;
        
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

  async sendEmail({ to, subject, template, data }) {
    return this.send(template, to, data);
  }

  async sendTest(recipientEmail) {
    return this.send('test', recipientEmail, {
      message: 'Az email rendszer működik! ✅'
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