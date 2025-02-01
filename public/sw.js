// Enhanced service worker with comprehensive browser support
const SW_VERSION = '1.0.2';
console.log(`[Service Worker ${SW_VERSION}] Initializing`);

// Enhanced error handling
self.addEventListener('error', event => {
  console.error('[Service Worker] Uncaught error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[Service Worker] Unhandled promise rejection:', event.reason);
});

// Enhanced push event handler with better browser support
self.addEventListener('push', event => {
  console.log('[Service Worker] Push message received');
  
  if (!event.data) {
    console.warn('[Service Worker] Push event received but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[Service Worker] Push data:', data);
    
    const options = {
      body: `${data.mission_type === 'immediate' ? '🔴 Mission immédiate' : '📅 Mission programmée'} - ${data.source_language} → ${data.target_language} (${data.estimated_duration} min)`,
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
      // High priority for all browsers
      priority: 'high',
      // Sound for mobile devices
      silent: false,
      // Ensure notification stays visible
      timestamp: Date.now()
    };

    event.waitUntil(
      (async () => {
        try {
          if (!self.registration.showNotification) {
            throw new Error('Notifications not supported');
          }

          const notification = await self.registration.showNotification(
            'Nouvelle mission disponible',
            options
          );
          
          console.log('[Service Worker] Notification shown successfully');
          return notification;
        } catch (error) {
          console.error('[Service Worker] Error showing notification:', error);
          throw error;
        }
      })()
    );
  } catch (error) {
    console.error('[Service Worker] Error processing push data:', error);
  }
});

// Enhanced notification click handling
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification clicked:', event.action);
  
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

        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            await client.focus();
            return;
          }
        }

        if (clients.openWindow) {
          await clients.openWindow(urlToOpen);
        }
      } catch (error) {
        console.error('[Service Worker] Error handling notification click:', error);
      }
    })()
  );
});

// Enhanced installation handling
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing');
  event.waitUntil(self.skipWaiting());
});

// Enhanced activation handling
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating');
  event.waitUntil(self.clients.claim());
});