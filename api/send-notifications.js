/**
 * API 端點：檢查並發送推送通知
 * GET /api/send-notifications
 *
 * 暫時版本：不使用 KV 資料庫
 */

const webpush = require('web-push');

// 設定 VAPID
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:skincare@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

module.exports = async (req, res) => {
  try {
    // 檢查環境變數
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return res.status(500).json({
        error: 'VAPID keys not configured',
        message: '請在 Vercel 設定環境變數'
      });
    }

    const currentTime = new Date().toISOString();

    // 暫時返回成功，等待資料庫設定完成
    return res.status(200).json({
      success: true,
      message: 'Notification service is running (KV database pending)',
      time: currentTime,
      note: '推送功能已準備就緒，等待資料庫連結'
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
