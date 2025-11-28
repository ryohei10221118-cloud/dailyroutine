// 使用時間戳作為版本號，每次更新自動改變
const CACHE_VERSION = '2025-11-28-004'; // 格式：YYYY-MM-DD-NNN
const CACHE_NAME = `skincare-reminder-${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
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

// 通知點擊事件
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
