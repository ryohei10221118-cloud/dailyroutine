/**
 * API 端點：處理推送訂閱
 * POST /api/subscribe
 *
 * 暫時版本：不使用 KV 資料庫
 */

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

    // 暫時只記錄，不儲存（等待資料庫設定）
    console.log('📥 Subscription received (not saved yet):', {
      endpoint: subscription.endpoint.substring(0, 50) + '...',
      timeSlots: timeSlots?.length || 0,
      reminders: reminders?.length || 0
    });

    return res.status(200).json({
      success: true,
      message: '訂閱已接收（等待資料庫連結）',
      note: 'KV 資料庫設定完成後將自動啟用'
    });

  } catch (error) {
    console.error('❌ Subscription error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
