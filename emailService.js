// emailService.js - SendGrid REST API

const sgMail = require('@sendgrid/mail');

// Email templates
const emailTemplates = {
  test: {
    subject: "OtthonFix - Email Teszt",
    html: `<div style="font-family:Arial;color:#0A2540;padding:20px;max-width:600px;margin:0 auto;">
      <h3>Email Teszt</h3>
      <p>{{message}}</p>
      <p style="color:#666;">Ez egy teszt email az OtthonFix rendszerből.</p>
    </div>`,
    text: `Email Teszt\n\n{{message}}`
  },
  
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
  }
};

class EmailService {
  constructor() {
    this.config = {
      company_name: 'OtthonFix',
      support_email: process.env.SUPPORT_EMAIL || 'info@otthonfix.com',
      from_email: process.env.SUPPORT_EMAIL || 'info@otthonfix.com',
      base_url: process.env.BASE_URL || 'http://localhost:3000'
    };

    // SendGrid inicializálás
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.initialized = true;
      console.log('📧 Email Service initialized (SendGrid REST API)');
      console.log(`   From: ${this.config.from_email}`);
      console.log(`   Base URL: ${this.config.base_url}`);
    } else {
      this.initialized = false;
      console.error('❌ SENDGRID_API_KEY not configured!');
    }
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
    if (!this.initialized) {
      throw new Error('SendGrid not initialized - check SENDGRID_API_KEY');
    }

    const template = emailTemplates[templateId];
    
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const subject = this.replacePlaceholders(template.subject, data);
    const html = this.replacePlaceholders(template.html, data);
    const text = this.replacePlaceholders(template.text, data);

    const msg = {
      to: recipientEmail,
      from: {
        email: this.config.from_email,
        name: this.config.company_name
      },
      subject: subject,
      text: text,
      html: html
    };

    try {
      const response = await sgMail.send(msg);
      
      console.log(`✅ Email sent via SENDGRID REST API: ${templateId} → ${recipientEmail}`);
      console.log(`   Status: ${response[0].statusCode}`);
      
      return {
        success: true,
        messageId: response[0].headers['x-message-id'],
        provider: 'sendgrid',
        template: templateId,
        recipient: recipientEmail,
        statusCode: response[0].statusCode
      };
    } catch (error) {
      console.error(`❌ SendGrid error:`, error.message);
      
      if (error.response) {
        console.error(`   Status: ${error.response.statusCode}`);
        console.error(`   Body:`, JSON.stringify(error.response.body));
      }
      
      return {
        success: false,
        error: error.message,
        details: error.response ? error.response.body : null,
        template: templateId,
        recipient: recipientEmail
      };
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

  async sendRegistrationConfirmation(user) {
    return this.send('reg_confirmation', user.email, {
      first_name: user.name.split(' ')[0],
      action_url: `${this.config.base_url}/activate?token=${user.activationToken}`
    });
  }

  async verifyConnection() {
    if (!this.initialized) {
      console.error('❌ SendGrid not initialized');
      return false;
    }
    console.log('✅ SendGrid REST API configured and ready');
    return true;
  }
}

module.exports = new EmailService();