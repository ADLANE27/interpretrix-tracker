
// Cache name for static assets
const CACHE_NAME = 'interpreter-cache-v1';

// Handle installation
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing Service Worker...', event);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll([
          '/',
          '/index.html',
          '/manifest.json'
        ]);
      })
  );
});

// Handle activation
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating Service Worker...', event);
  return self.clients.claim();
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push Received:', event);

  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[ServiceWorker] Push data:', data);

      const options = {
        body: data.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: data.data || {},
        actions: [
          {
            action: 'open',
            title: 'Ouvrir'
          }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(data.title, options)
      );
    } catch (error) {
      console.error('[ServiceWorker] Error processing push event:', error);
    }
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click Received:', event);

  event.notification.close();

  // Get the target URL from the notification data
  const targetUrl = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(windowClients => {
        // Check if there is already a window/tab open with the target URL
        for (let client of windowClients) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window/tab is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Handle fetch events (important for CORS)
self.addEventListener('fetch', (event) => {
  console.log('[ServiceWorker] Fetch event:', event.request.url);
});
