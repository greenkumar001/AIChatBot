const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

module.exports = {
  client: redis,
  async pushMessage(sessionId, message) {
    
    await redis.rpush(sessionId, JSON.stringify(message));
    
    const ttl = await redis.ttl(sessionId);
    if (ttl === -1) {
      const defaultTtl = parseInt(process.env.SESSION_TTL_SECONDS || "86400", 10);
      await redis.expire(sessionId, defaultTtl);
    }
  },
  async getHistory(sessionId) {
    const msgs = await redis.lrange(sessionId, 0, -1);
    return msgs.map(s => JSON.parse(s));
  },
  async clearHistory(sessionId) {
    await redis.del(sessionId);
  }
};
