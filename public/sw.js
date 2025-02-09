
// Enhanced service worker with comprehensive browser support and logging
const SW_VERSION = '1.0.9';
console.log(`[Service Worker ${SW_VERSION}] Initializing`);

// Enhanced error handling with detailed logging
self.addEventListener('error', event => {
  console.error('[Service Worker] Uncaught error:', event.error);
  console.error('[Service Worker] Stack:', event.error.stack);
  console.error('[Service Worker] Message:', event.error.message);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[Service Worker] Unhandled promise rejection:', event.reason);
  if (event.reason.stack) {
    console.error('[Service Worker] Stack:', event.reason.stack);
  }
});

// Enhanced notification click handling with better navigation
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification clicked:', {
    action: event.action,
    notification: {
      tag: event.notification.tag,
      data: event.notification.data
    }
  });
  
  event.notification.close();

  if (event.action === 'decline') {
    console.log('[Service Worker] Mission declined');
    return;
  }

  const urlToOpen = new URL('/', self.location.origin).href;

  event.waitUntil(
    (async () => {
      try {
        const windowClients = await clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });

        console.log('[Service Worker] Found window clients:', windowClients.length);

        // Try to focus an existing window first
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            console.log('[Service Worker] Focusing existing window');
            await client.focus();
            return;
          }
        }

        // If no existing window, open a new one
        if (clients.openWindow) {
          console.log('[Service Worker] Opening new window:', urlToOpen);
          await clients.openWindow(urlToOpen);
        }
      } catch (error) {
        console.error('[Service Worker] Error handling notification click:', error);
        console.error('[Service Worker] Stack:', error.stack);
      }
    })()
  );
});

self.addEventListener('install', event => {
  console.log(`[Service Worker ${SW_VERSION}] Installing`);
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log(`[Service Worker ${SW_VERSION}] Activating`);
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== 'v1') {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});
