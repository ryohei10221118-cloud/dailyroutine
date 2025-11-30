/**
 * API 端點：處理推送訂閱
 * POST /api/subscribe
 */

const { kv } = require('./redis');

module.exports = async (req, res) => {
  // 設定 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscription, timeSlots, reminders } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    // 使用 endpoint 作為唯一 ID
    const subscriptionId = Buffer.from(subscription.endpoint).toString('base64');

    // 儲存訂閱資料
    const data = {
      subscription,
      timeSlots: timeSlots || [],
      reminders: reminders || [],
      updatedAt: new Date().toISOString()
    };

    // 儲存到 Vercel KV
    await kv.set(`subscription:${subscriptionId}`, JSON.stringify(data));

    // 加入訂閱列表
    await kv.sadd('subscriptions', subscriptionId);

    console.log('✅ Subscription saved:', subscriptionId);

    return res.status(200).json({
      success: true,
      message: '訂閱成功',
      subscriptionId
    });

  } catch (error) {
    console.error('❌ Subscription error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
