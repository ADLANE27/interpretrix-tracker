
// Version for cache management
const CACHE_VERSION = 'v1';

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...', event);
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll([
        '/',
        '/index.html',
        '/sounds/immediate-mission.mp3',
        '/sounds/scheduled-mission.mp3'
      ]);
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...', event);
  return self.clients.claim();
});

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.', event);

  if (!event.data) {
    console.log('[Service Worker] No data received in push event');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[Service Worker] Received push data:', data);

    const options = {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: data.data || {},
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'open',
          title: 'Voir les détails'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('[Service Worker] Error processing push event:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click received.', event);

  event.notification.close();

  // Get the URL to open from the notification data
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window'
    })
    .then(function(clientList) {
      // Check if there is already a window/tab open with the target URL
      for (const client of clientList) {
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

self.addEventListener('fetch', (event) => {
  // Basic fetch handler for offline support
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});
