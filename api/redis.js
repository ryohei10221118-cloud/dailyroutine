/**
 * Redis 客戶端封裝
 * 相容於原本的 Vercel KV 介面
 */

const Redis = require('ioredis');

let redis = null;

function getRedisClient() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL);
  }
  return redis;
}

// 模擬 Vercel KV 的介面
const kv = {
  async get(key) {
    const client = getRedisClient();
    return await client.get(key);
  },

  async set(key, value) {
    const client = getRedisClient();
    return await client.set(key, value);
  },

  async sadd(key, value) {
    const client = getRedisClient();
    return await client.sadd(key, value);
  },

  async smembers(key) {
    const client = getRedisClient();
    return await client.smembers(key);
  },

  async srem(key, value) {
    const client = getRedisClient();
    return await client.srem(key, value);
  },

  async del(key) {
    const client = getRedisClient();
    return await client.del(key);
  }
};

module.exports = { kv };
