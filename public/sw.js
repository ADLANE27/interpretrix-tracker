
// Service Worker Version
const SW_VERSION = '1.0.0';

// Cache name for offline support
const CACHE_NAME = `offline-cache-${SW_VERSION}`;

// Listen for push events
self.addEventListener('push', async (event) => {
  if (!event.data) {
    console.log('[Service Worker] Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[Service Worker] Push data received:', data);

    const options = {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: {
        url: data.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('[Service Worker] Error handling push event:', error);
  }
});

// Listen for notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click received');

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window/tab is already open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Installation du service worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Cache opened');
      return cache.addAll([
        '/',
        '/index.html',
        '/favicon.ico'
      ]);
    })
  );
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
