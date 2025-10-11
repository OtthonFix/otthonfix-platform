require('dotenv').config();

module.exports = {
  provider: 'sendgrid',
  
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.FROM_EMAIL || 'noreply@otthonfix.hu',
    fromName: process.env.FROM_NAME || 'otthonfix',
    replyTo: process.env.REPLY_TO_EMAIL || 'support@otthonfix.hu'
  },
  
  templates: {
    path: './templates/emails',
    partialsPath: './templates/partials',
    cache: process.env.NODE_ENV === 'production'
  },
  
  queue: {
    name: 'email-queue',
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || null,
      db: parseInt(process.env.REDIS_DB) || 0
    },
    options: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    }
  },
  
  tracking: {
    enabled: true,
    openTracking: true,
    clickTracking: true
  }
};