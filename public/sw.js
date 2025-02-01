// Enhanced service worker with better error handling and notification management
self.addEventListener('push', event => {
  console.log('[Service Worker] Push message received:', event);
  
  if (!event.data) {
    console.warn('[Service Worker] Push event received but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[Service Worker] Push data:', data);
    
    // Enhanced notification options with better mobile support
    const options = {
      body: `${data.mission_type === 'immediate' ? '🔴 Mission immédiate' : '📅 Mission programmée'} - ${data.source_language} → ${data.target_language} (${data.estimated_duration} min)`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: {
        missionId: data.mission_id,
        url: '/',
        timestamp: Date.now()
      },
      requireInteraction: true,
      // Enhanced vibration pattern for better attention on mobile
      vibrate: [200, 100, 200],
      // Sound for desktop notifications
      silent: false,
      // Ensure notifications are shown immediately
      timestamp: Date.now(),
      // Enhanced actions for better user interaction
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
      // Improved notification grouping
      tag: `mission-${data.mission_id}`,
      renotify: true,
      // Priority for Android devices
      priority: 'high'
    };

    console.log('[Service Worker] Showing notification with options:', options);

    // More robust notification handling with proper error management
    event.waitUntil(
      (async () => {
        try {
          // Enhanced permission check
          if (Notification.permission !== 'granted') {
            console.error('[Service Worker] Notification permission not granted');
            throw new Error('Notification permission not granted');
          }

          // Check if we can show notifications
          if (!self.registration.showNotification) {
            console.error('[Service Worker] Notifications not supported');
            throw new Error('Notifications not supported');
          }

          // Show notification with enhanced error handling
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

// Enhanced notification click handling with better error management
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification clicked:', event);
  
  // Close the notification
  event.notification.close();

  // Enhanced action handling
  if (event.action === 'decline') {
    console.log('[Service Worker] Mission declined');
    return;
  }

  // Get the mission data with proper error handling
  const missionData = event.notification.data || {};
  console.log('[Service Worker] Notification data:', missionData);

  // Enhanced URL handling with validation
  const urlToOpen = new URL('/', self.location.origin).href;

  // More robust window handling with proper error management
  event.waitUntil(
    (async () => {
      try {
        // Enhanced window client handling
        const windowClients = await clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });
        
        console.log('[Service Worker] Found window clients:', windowClients);

        // Try to find and focus an existing window
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            await client.focus();
            // Post message to client for mission handling
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              missionId: missionData.missionId,
              action: event.action
            });
            return;
          }
        }

        // If no existing window, open a new one with enhanced error handling
        if (clients.openWindow) {
          try {
            const newWindow = await clients.openWindow(urlToOpen);
            console.log('[Service Worker] New window opened:', newWindow);
            if (newWindow) {
              // Wait for the window to load and post message
              setTimeout(() => {
                newWindow.postMessage({
                  type: 'NOTIFICATION_CLICK',
                  missionId: missionData.missionId,
                  action: event.action
                });
              }, 1000);
            }
          } catch (windowError) {
            console.error('[Service Worker] Error opening window:', windowError);
            throw windowError;
          }
        }
      } catch (error) {
        console.error('[Service Worker] Error handling notification click:', error);
        throw error;
      }
    })()
  );
});

// Enhanced service worker installation with better cache management
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

// Enhanced activation handling with proper cache cleanup
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker:', event);
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old caches
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

// Enhanced error handling for uncaught errors
self.addEventListener('error', event => {
  console.error('[Service Worker] Uncaught error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[Service Worker] Unhandled promise rejection:', event.reason);
});