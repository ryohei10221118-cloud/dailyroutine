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
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getCurrentWeekday() {
  return new Date().getDay();
}

// 計算提前通知的時間（根據提前分鐘數）
function getNotificationTime(scheduledTime, advanceMinutes = 0) {
  if (advanceMinutes === 0) return scheduledTime;

  const [hours, minutes] = scheduledTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  const notifyMinutes = totalMinutes - advanceMinutes;

  // 處理跨日情況（如果提前時間導致時間為負數）
  if (notifyMinutes < 0) {
    return null; // 不在當天發送
  }

  const notifyHours = Math.floor(notifyMinutes / 60);
  const notifyMins = notifyMinutes % 60;
  return `${notifyHours.toString().padStart(2, '0')}:${notifyMins.toString().padStart(2, '0')}`;
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
          // 計算實際通知時間（考慮提前分鐘數）
          const notifyTime = getNotificationTime(reminder.time, reminder.advanceMinutes || 0);

          if (reminder.enabled &&
              notifyTime === currentTime &&
              reminder.weekdays.includes(currentWeekday)) {

            const advanceText = reminder.advanceMinutes > 0
              ? ` (原時間: ${reminder.time})`
              : '';

            await webpush.sendNotification(
              subscription,
              JSON.stringify({
                title: reminder.title || '⏰ 提醒',
                body: `${reminder.content || '提醒時間到了！'}${advanceText}`,
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
            console.log(`✅ Sent notification for reminder: ${reminder.title} at ${currentTime} (scheduled: ${reminder.time}, advance: ${reminder.advanceMinutes || 0}min)`);
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
