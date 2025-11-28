// 使用時間戳作為版本號，每次更新自動改變
const CACHE_VERSION = '2025-11-28-006'; // 格式：YYYY-MM-DD-NNN
const CACHE_NAME = `skincare-reminder-${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/push-manager.js',
  '/manifest.json'
];

// 安裝事件 - 緩存資源
self.addEventListener('install', event => {
  // 立即激活新的 Service Worker
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// 激活事件 - 清理舊緩存
self.addEventListener('activate', event => {
  // 立即控制所有頁面
  event.waitUntil(
    Promise.all([
      // 清理舊緩存
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 立即接管所有客戶端
      self.clients.claim()
    ])
  );
});

// 請求事件 - 提供緩存資源
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// 推送事件 - 接收來自伺服器的推送
self.addEventListener('push', event => {
  console.log('📨 Push received:', event);

  let notificationData = {
    title: '⏰ 保養提醒',
    body: '該執行保養流程囉！',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'skincare-reminder',
    requireInteraction: true,
    data: {
      url: '/'
    }
  };

  // 如果有推送資料，解析它
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData,
        requireInteraction: true
      };
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      vibrate: [200, 100, 200],
      data: notificationData.data
    })
  );
});

// 通知點擊事件
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // 檢查是否已有打開的視窗
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // 沒有則開新視窗
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
