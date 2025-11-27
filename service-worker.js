const CACHE_NAME = 'skincare-reminder-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json'
];

// 安裝事件 - 緩存資源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// 激活事件 - 清理舊緩存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 請求事件 - 提供緩存資源
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// 通知點擊事件
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

// 推送通知事件
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '保養提醒';
  const options = {
    body: data.body || '該進行保養囉！',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: data,
    requireInteraction: true,
    actions: [
      { action: 'view', title: '查看流程' },
      { action: 'dismiss', title: '稍後提醒' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 定時檢查提醒
self.addEventListener('message', event => {
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { time, title, body, routineId } = event.data;
    scheduleNotification(time, title, body, routineId);
  }
});

function scheduleNotification(time, title, body, routineId) {
  // 計算延遲時間
  const now = new Date();
  const scheduledTime = new Date(time);
  const delay = scheduledTime.getTime() - now.getTime();

  if (delay > 0) {
    setTimeout(() => {
      self.registration.showNotification(title, {
        body: body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        data: { routineId: routineId },
        requireInteraction: true,
        actions: [
          { action: 'view', title: '開始執行' },
          { action: 'dismiss', title: '稍後' }
        ]
      });
    }, delay);
  }
}
