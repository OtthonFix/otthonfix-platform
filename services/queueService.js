const Queue = require('bull');
const emailConfig = require('../config/email');

const emailQueue = new Queue(emailConfig.queue.name, {
  redis: emailConfig.queue.redis,
  ...emailConfig.queue.options
});

emailQueue.process('send-email', async (job) => {
  const emailService = require('./emailService');
  
  if (!emailService.initialized) {
    await emailService.initialize();
  }
  
  return await emailService.processEmail(job.data);
});

emailQueue.on('completed', (job, result) => {
  console.log(`✅ Email sent: ${result.messageId}`);
});

emailQueue.on('failed', (job, err) => {
  console.error(`❌ Email failed:`, err.message);
});

module.exports = emailQueue;