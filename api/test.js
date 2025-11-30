/**
 * 測試 API - 檢查基本功能
 */

module.exports = async (req, res) => {
  try {
    // 測試 1: 基本回應
    const tests = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: {
        hasVapidPublic: !!process.env.VAPID_PUBLIC_KEY,
        hasVapidPrivate: !!process.env.VAPID_PRIVATE_KEY,
        hasVapidSubject: !!process.env.VAPID_SUBJECT,
      }
    };

    // 測試 2: Redis 連線
    try {
      const { kv } = require('./redis');
      await kv.set('test-key', 'test-value');
      const value = await kv.get('test-key');
      tests.redis = {
        connected: true,
        testResult: value === 'test-value'
      };
    } catch (error) {
      tests.redis = {
        connected: false,
        error: error.message
      };
    }

    // 測試 3: Web Push
    try {
      const webpush = require('web-push');
      tests.webpush = {
        loaded: true,
        version: webpush.generateVAPIDKeys ? 'OK' : 'Missing methods'
      };
    } catch (error) {
      tests.webpush = {
        loaded: false,
        error: error.message
      };
    }

    return res.status(200).json(tests);

  } catch (error) {
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
};
