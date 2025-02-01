// Enhanced service worker with comprehensive error handling and logging
const SW_VERSION = '1.0.0';
console.log(`[Service Worker ${SW_VERSION}] Initializing`);

// Enhanced error handling for uncaught errors
self.addEventListener('error', event => {
  console.error('[Service Worker] Uncaught error:', {
    error: event.error,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

self.addEventListener('unhandledrejection', event => {
  console.error('[Service Worker] Unhandled promise rejection:', {
    reason: event.reason,
    promise: event.promise
  });
});

// Enhanced push event handler with better error management
self.addEventListener('push', event => {
  console.log('[Service Worker] Push message received:', event);
  
  if (!event.data) {
    console.warn('[Service Worker] Push event received but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[Service Worker] Push data:', data);
    
    // Enhanced notification options with better mobile and desktop support
    const options = {
      body: `${data.mission_type === 'immediate' ? '🔴 Mission immédiate' : '📅 Mission programmée'} - ${data.source_language} → ${data.target_language} (${data.estimated_duration} min)`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: {
        missionId: data.mission_id,
        url: '/',
        timestamp: Date.now()
      },
      // Enhanced mobile experience
      vibrate: [200, 100, 200],
      tag: `mission-${data.mission_id}`,
      renotify: true,
      requireInteraction: true,
      silent: false,
      timestamp: Date.now(),
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
      // Priority for Android devices
      priority: 'high'
    };

    console.log('[Service Worker] Showing notification with options:', options);

    event.waitUntil(
      (async () => {
        try {
          // Enhanced permission and support checks
          if (!self.registration.showNotification) {
            throw new Error('Notifications not supported');
          }

          if (Notification.permission !== 'granted') {
            throw new Error('Notification permission not granted');
          }

          const notification = await self.registration.showNotification(
            'Nouvelle mission disponible',
            options
          );
          
          console.log('[Service Worker] Notification shown successfully:', notification);
          return notification;
        } catch (error) {
          console.error('[Service Worker] Error showing notification:', error);
          // Attempt to show a fallback notification
          try {
            await self.registration.showNotification(
              'Nouvelle mission',
              {
                body: 'Une nouvelle mission est disponible',
                requireInteraction: true,
                tag: 'fallback'
              }
            );
          } catch (fallbackError) {
            console.error('[Service Worker] Fallback notification failed:', fallbackError);
          }
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
  console.log('[Service Worker] Notification clicked:', {
    action: event.action,
    notification: event.notification
  });
  
  event.notification.close();

  if (event.action === 'decline') {
    console.log('[Service Worker] Mission declined');
    return;
  }

  const missionData = event.notification.data || {};
  console.log('[Service Worker] Notification data:', missionData);

  const urlToOpen = new URL('/', self.location.origin).href;

  event.waitUntil(
    (async () => {
      try {
        const windowClients = await clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });
        
        console.log('[Service Worker] Found window clients:', windowClients);

        // Try to focus existing window
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            await client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              missionId: missionData.missionId,
              action: event.action
            });
            return;
          }
        }

        // Open new window if none exists
        if (clients.openWindow) {
          const newWindow = await clients.openWindow(urlToOpen);
          console.log('[Service Worker] New window opened:', newWindow);
          
          if (newWindow) {
            setTimeout(() => {
              newWindow.postMessage({
                type: 'NOTIFICATION_CLICK',
                missionId: missionData.missionId,
                action: event.action
              });
            }, 1000);
          }
        }
      } catch (error) {
        console.error('[Service Worker] Error handling notification click:', error);
        throw error;
      }
    })()
  );
});

// Enhanced installation handling
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker:', event);
  
  event.waitUntil(
    Promise.all([
      self.skipWaiting(),
      caches.open('v1').then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll([
          '/',
          '/favicon.ico'
        ]);
      })
    ]).then(() => {
      console.log('[Service Worker] Installation completed successfully');
    }).catch(error => {
      console.error('[Service Worker] Installation failed:', error);
      throw error;
    })
  );
});

// Enhanced activation handling with cache cleanup
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker:', event);
  
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== 'v1') {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ]).then(() => {
      console.log('[Service Worker] Activation completed successfully');
    }).catch(error => {
      console.error('[Service Worker] Activation failed:', error);
      throw error;
    })
  );
});