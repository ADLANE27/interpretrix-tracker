// Service Worker version
const SW_VERSION = '1.0.0';

// Cache name for offline functionality
const CACHE_NAME = `interpretrix-cache-${SW_VERSION}`;

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing new version:', SW_VERSION);
  event.waitUntil(
    Promise.all([
      self.skipWaiting(),
      // Pre-cache essential resources
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll([
          '/',
          '/index.html',
          '/manifest.json',
          '/favicon.ico',
          '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png'
        ]);
      })
    ])
  );
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating new version:', SW_VERSION);
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith('interpretrix-cache-') && cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // Handle fetch requests (important for keeping the service worker alive)
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received:', event);

  if (!event.data) {
    console.log('[Service Worker] Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[Service Worker] Push data:', data);

    const options = {
      body: data.body,
      icon: data.icon || '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png',
      badge: data.badge || '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png',
      data: {
        ...data.data,
        url: self.registration.scope,
      },
      tag: data.tag || 'default',
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'open',
          title: 'Ouvrir',
        },
        {
          action: 'close',
          title: 'Fermer',
        },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('[Service Worker] Error handling push:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);

  try {
    event.notification.close();

    let urlToOpen = event.notification.data?.url || '/';
    if (event.action === 'open') {
      urlToOpen = event.notification.data?.url || '/';
    }

    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window/tab is open, open a new one
        return clients.openWindow(urlToOpen);
      })
    );
  } catch (error) {
    console.error('[Service Worker] Error handling notification click:', error);
  }
});

// Keep alive heartbeat
setInterval(() => {
  console.log('[Service Worker] Heartbeat');
}, 25000);
