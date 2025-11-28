/**
 * API 端點：檢查並發送推送通知
 * GET /api/send-notifications
 */

const { kv } = require('./redis');
const webpush = require('web-push');

// 設定 VAPID
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:skincare@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

function getCurrentTime() {
  const now = new Date();
  // 转换为 UTC+8 时区
  const utc8 = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  const hours = utc8.getUTCHours().toString().padStart(2, '0');
  const minutes = utc8.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getCurrentWeekday() {
  const now = new Date();
  // 转换为 UTC+8 时区
  const utc8 = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return utc8.getUTCDay();
}

module.exports = async (req, res) => {
  try {
    const currentTime = getCurrentTime();
    const currentWeekday = getCurrentWeekday();

    console.log(`⏰ Checking notifications at ${currentTime}, weekday ${currentWeekday}`);

    // 取得所有訂閱
    const subscriptionIds = await kv.smembers('subscriptions');

    if (!subscriptionIds || subscriptionIds.length === 0) {
      console.log('ℹ️ No subscriptions found');
      return res.status(200).json({
        success: true,
        message: 'No subscriptions',
        sent: 0
      });
    }

    let sentCount = 0;
    const results = [];

    // 處理每個訂閱
    for (const subscriptionId of subscriptionIds) {
      try {
        const dataStr = await kv.get(`subscription:${subscriptionId}`);
        if (!dataStr) continue;

        const data = JSON.parse(dataStr);
        const { subscription, timeSlots = [], reminders = [] } = data;

        // 檢查時段提醒
        for (const slot of timeSlots) {
          if (slot.enabled &&
              slot.time === currentTime &&
              slot.weekdays.includes(currentWeekday)) {

            await webpush.sendNotification(
              subscription,
              JSON.stringify({
                title: slot.name || '⏰ 保養提醒',
                body: `該執行「${slot.routine}」囉！`,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: `slot-${slot.id}`,
                data: {
                  url: '/',
                  type: 'timeslot',
                  id: slot.id
                }
              })
            );

            sentCount++;
            console.log(`✅ Sent notification for slot: ${slot.name}`);
          }
        }

        // 檢查純提醒
        for (const reminder of reminders) {
          if (reminder.enabled &&
              reminder.time === currentTime &&
              reminder.weekdays.includes(currentWeekday)) {

            await webpush.sendNotification(
              subscription,
              JSON.stringify({
                title: reminder.title || '⏰ 提醒',
                body: reminder.content || '提醒時間到了！',
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: `reminder-${reminder.id}`,
                data: {
                  url: '/',
                  type: 'reminder',
                  id: reminder.id
                }
              })
            );

            sentCount++;
            console.log(`✅ Sent notification for reminder: ${reminder.title}`);
          }
        }

        results.push({ subscriptionId, status: 'success' });

      } catch (error) {
        console.error(`❌ Error processing subscription ${subscriptionId}:`, error);

        // 如果訂閱無效，移除它
        if (error.statusCode === 410) {
          await kv.srem('subscriptions', subscriptionId);
          await kv.del(`subscription:${subscriptionId}`);
          console.log(`🗑️ Removed invalid subscription: ${subscriptionId}`);
        }

        results.push({ subscriptionId, status: 'error', error: error.message });
      }
    }

    console.log(`📊 Total notifications sent: ${sentCount}`);

    return res.status(200).json({
      success: true,
      time: currentTime,
      weekday: currentWeekday,
      subscriptions: subscriptionIds.length,
      sent: sentCount,
      results
    });

  } catch (error) {
    console.error('❌ Send notifications error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
