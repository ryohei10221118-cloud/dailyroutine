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

function getCurrentDatetime() {
  const now = new Date();
  // 转换为 UTC+8 时区
  const utc8 = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  // 返回 ISO 格式但去掉秒和毫秒，只保留到分钟
  const year = utc8.getUTCFullYear();
  const month = (utc8.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = utc8.getUTCDate().toString().padStart(2, '0');
  const hours = utc8.getUTCHours().toString().padStart(2, '0');
  const minutes = utc8.getUTCMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// 計算提前通知的時間
function getAdvancedTime(time, advanceMinutes = 0) {
  if (!advanceMinutes) return time;
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes - advanceMinutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
}

// 計算提前通知的日期時間
function getAdvancedDatetime(datetime, advanceMinutes = 0) {
  if (!advanceMinutes) return datetime;
  const dt = new Date(datetime);
  dt.setMinutes(dt.getMinutes() - advanceMinutes);
  const year = dt.getFullYear();
  const month = (dt.getMonth() + 1).toString().padStart(2, '0');
  const day = dt.getDate().toString().padStart(2, '0');
  const hours = dt.getHours().toString().padStart(2, '0');
  const minutes = dt.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

module.exports = async (req, res) => {
  try {
    const currentTime = getCurrentTime();
    const currentWeekday = getCurrentWeekday();
    const currentDatetime = getCurrentDatetime();

    console.log(`⏰ Checking notifications at ${currentTime}, weekday ${currentWeekday}, datetime ${currentDatetime}`);

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
        let needsUpdate = false;
        const updatedReminders = [];

        for (const reminder of reminders) {
          let shouldSend = false;
          const advanceTime = reminder.advanceTime || 0;

          // 檢查重複提醒
          if ((!reminder.type || reminder.type === 'recurring') &&
              reminder.enabled &&
              reminder.time &&
              reminder.weekdays &&
              reminder.weekdays.includes(currentWeekday)) {
            const notificationTime = getAdvancedTime(reminder.time, advanceTime);
            if (notificationTime === currentTime) {
              shouldSend = true;
            }
          }

          // 檢查一次性提醒
          if (reminder.type === 'once' &&
              reminder.enabled &&
              reminder.datetime) {
            const notificationDatetime = getAdvancedDatetime(reminder.datetime, advanceTime);
            if (notificationDatetime === currentDatetime) {
              shouldSend = true;
              needsUpdate = true; // 一次性提醒發送後需要移除
            }
          }

          if (reminder.type === 'once') {
            // 保留未到期的一次性提醒
            updatedReminders.push(reminder);
          } else {
            // 保留所有重複提醒
            updatedReminders.push(reminder);
          }

          if (shouldSend) {
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
            console.log(`✅ Sent notification for reminder: ${reminder.title} (${reminder.type || 'recurring'})`);
          }
        }

        // 如果有一次性提醒被發送，更新訂閱數據
        if (needsUpdate) {
          data.reminders = updatedReminders;
          await kv.set(`subscription:${subscriptionId}`, JSON.stringify(data));
          console.log(`📝 Updated subscription ${subscriptionId} - removed sent once-time reminders`);
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
