self.addEventListener('push', event => {
  console.log('[Service Worker] Push message received:', event);
  
  if (!event.data) {
    console.warn('[Service Worker] Push event received but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[Service Worker] Push data:', data);
    
    // Enhanced notification options
    const options = {
      body: `${data.mission_type === 'immediate' ? '🔴 Mission immédiate' : '📅 Mission programmée'} - ${data.source_language} → ${data.target_language} (${data.estimated_duration} min)`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: {
        missionId: data.mission_id,
        url: '/'
      },
      requireInteraction: true,
      // Enhanced vibration pattern for better attention
      vibrate: [100, 50, 100, 50, 100],
      // Sound for desktop notifications (if supported)
      silent: false,
      timestamp: Date.now(),
      actions: [
        {
          action: 'open',
          title: 'Voir la mission'
        },
        {
          action: 'close',
          title: 'Fermer'
        }
      ],
      // Ensure each notification is unique but don't stack them
      tag: `new-mission-${data.mission_id}`,
      renotify: true
    };

    console.log('[Service Worker] Showing notification with options:', options);

    // More robust notification handling
    event.waitUntil(
      (async () => {
        try {
          // Check if we have permission first
          if (Notification.permission !== 'granted') {
            console.warn('[Service Worker] Notification permission not granted');
            return;
          }

          const notification = await self.registration.showNotification(
            'Nouvelle mission disponible',
            options
          );
          
          console.log('[Service Worker] Notification shown successfully:', notification);
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

self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification clicked:', event);
  
  // Close the notification
  event.notification.close();

  // Handle close action
  if (event.action === 'close') {
    console.log('[Service Worker] Notification closed by user action');
    return;
  }

  // Get the mission data
  const missionData = event.notification.data;
  console.log('[Service Worker] Notification data:', missionData);

  // Enhanced URL handling
  const urlToOpen = new URL('/', self.location.origin).href;

  // More robust window handling
  event.waitUntil(
    (async () => {
      try {
        // Get all windows
        const windowClients = await clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });
        
        console.log('[Service Worker] Found window clients:', windowClients);

        // Try to find an existing window
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            await client.focus();
            return;
          }
        }

        // If no existing window, open a new one
        console.log('[Service Worker] Opening new window');
        if (clients.openWindow) {
          const newWindow = await clients.openWindow(urlToOpen);
          console.log('[Service Worker] New window opened:', newWindow);
        }
      } catch (error) {
        console.error('[Service Worker] Error handling notification click:', error);
      }
    })()
  );
});

// Enhanced service worker installation
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
    })
  );
});

// Enhanced activation handling
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
    })
  );
});

// Enhanced error handling
self.addEventListener('error', event => {
  console.error('[Service Worker] Error occurred:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[Service Worker] Unhandled promise rejection:', event.reason);
});