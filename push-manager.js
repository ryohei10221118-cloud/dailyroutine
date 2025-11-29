/**
 * 推送通知管理模組
 */

const PushManager = {
  // VAPID 公鑰
  vapidPublicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE_R009GZ-IwQUptJnLb43uHCAd_NtpdBD-l6YP9fRghoXtm3ZpqFMX-p4cAOL5y0Y0OhbkFjaDI39vOETySDA_w',

  // API 端點
  apiEndpoint: '/api',

  // 將 base64 轉換為 Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  },

  // 訂閱推送服務
  async subscribe() {
    try {
      // 檢查瀏覽器支援
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('您的瀏覽器不支援推送通知');
      }

      // 請求通知權限
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('請允許通知權限才能使用推送功能');
      }

      // 取得 Service Worker 註冊
      const registration = await navigator.serviceWorker.ready;

      // 訂閱推送
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      console.log('✅ Push subscription:', subscription);

      // 發送訂閱資訊到伺服器
      await this.sendSubscriptionToServer(subscription);

      return subscription;

    } catch (error) {
      console.error('❌ Push subscription error:', error);
      throw error;
    }
  },

  // 發送訂閱資訊到伺服器
  async sendSubscriptionToServer(subscription) {
    try {
      // 取得當前的時段和提醒設定
      const timeSlots = JSON.parse(localStorage.getItem('skincareData') || '{}').timeSlots || [];
      const reminders = JSON.parse(localStorage.getItem('skincareData') || '{}').reminders || [];

      const response = await fetch(`${this.apiEndpoint}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          timeSlots,
          reminders
        })
      });

      if (!response.ok) {
        throw new Error('訂閱失敗');
      }

      const result = await response.json();
      console.log('✅ Subscription sent to server:', result);

      return result;

    } catch (error) {
      console.error('❌ Send subscription error:', error);
      throw error;
    }
  },

  // 更新訂閱（當時段或提醒改變時）
  async updateSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await this.sendSubscriptionToServer(subscription);
        console.log('✅ Subscription updated');
      }
    } catch (error) {
      console.error('❌ Update subscription error:', error);
    }
  },

  // 取消訂閱
  async unsubscribe() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        console.log('✅ Unsubscribed from push');
      }
    } catch (error) {
      console.error('❌ Unsubscribe error:', error);
      throw error;
    }
  },

  // 檢查是否已訂閱
  async isSubscribed() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch (error) {
      return false;
    }
  }
};

// 匯出給其他模組使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PushManager;
}
