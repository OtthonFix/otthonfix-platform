const Redis = require('ioredis');
const emailConfig = require('./email');

const redis = new Redis({
  host: emailConfig.queue.redis.host,
  port: emailConfig.queue.redis.port,
  password: emailConfig.queue.redis.password,
  db: emailConfig.queue.redis.db,
  
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  }
});

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('❌ Redis error:', err));

module.exports = redis;