
// Cache name
const CACHE_NAME = 'aft-traduction-v1';

// Files to cache
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// Push event
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');
  
  if (!event.data) {
    console.log('[ServiceWorker] Push received but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[ServiceWorker] Push data:', data);

    const options = {
      body: data.body,
      icon: '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png',
      badge: '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png',
      vibrate: [200, 100, 200],
      data: data.data,
      actions: [
        {
          action: 'open',
          title: 'Ouvrir'
        }
      ],
      tag: data.data?.missionId || 'default',
      renotify: true
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
        .then(() => {
          console.log('[ServiceWorker] Notification shown successfully');
          // If there's a notificationId, confirm delivery
          if (data.data?.notificationId) {
            return fetch('/api/notifications/confirm', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                notificationId: data.data.notificationId
              })
            });
          }
        })
        .catch((error) => {
          console.error('[ServiceWorker] Error showing notification:', error);
        })
    );
  } catch (error) {
    console.error('[ServiceWorker] Error processing push event:', error);
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click received');

  const notification = event.notification;
  const action = event.action;
  const data = notification.data;

  notification.close();

  if (action === 'open' || !action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          // If we have a specific URL to open
          const url = data?.url || '/';

          // Check if there's already a window/tab open
          for (const client of clientList) {
            if (client.url === url && 'focus' in client) {
              return client.focus();
            }
          }
          // If no window/tab is open, open a new one
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});

// Fetch event - Network first strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
