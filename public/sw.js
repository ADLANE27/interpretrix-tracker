
// Enhanced service worker with comprehensive browser support and logging
const SW_VERSION = '1.0.5';
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

// Enhanced push event handler with better debugging
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received at:', new Date().toISOString());
  
  if (!event.data) {
    console.warn('[Service Worker] Push event received but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[Service Worker] Push data:', JSON.stringify(data, null, 2));
    
    const options = {
      body: data.body || `${data.mission_type === 'immediate' ? '🔴 Mission immédiate' : '📅 Mission programmée'} - ${data.source_language} → ${data.target_language} (${data.estimated_duration} min)`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: {
        missionId: data.mission_id,
        url: '/',
        timestamp: Date.now()
      },
      vibrate: [200, 100, 200],
      tag: `mission-${data.mission_id}`,
      renotify: true,
      requireInteraction: true,
      actions: [
        {
          action: 'accept',
          title: 'Accepter'
        },
        {
          action: 'decline',
          title: 'Décliner'
        }
      ],
      priority: 'high',
      silent: false,
      timestamp: Date.now()
    };

    event.waitUntil(
      (async () => {
        try {
          if (!self.registration.showNotification) {
            throw new Error('Notifications not supported');
          }

          console.log('[Service Worker] Showing notification with options:', JSON.stringify(options, null, 2));
          const notification = await self.registration.showNotification(
            data.title || 'Nouvelle mission disponible',
            options
          );
          
          console.log('[Service Worker] Notification shown successfully');
          return notification;
        } catch (error) {
          console.error('[Service Worker] Error showing notification:', error);
          console.error('[Service Worker] Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
          throw error;
        }
      })()
    );
  } catch (error) {
    console.error('[Service Worker] Error processing push data:', error);
    console.error('[Service Worker] Stack:', error.stack);
  }
});

// Enhanced notification click handling with debugging
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

        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            console.log('[Service Worker] Focusing existing window');
            await client.focus();
            return;
          }
        }

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
  event.waitUntil(
    caches.open('v1').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/favicon.ico'
      ]);
    })
  );
});

self.addEventListener('activate', event => {
  console.log(`[Service Worker ${SW_VERSION}] Activating`);
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
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
