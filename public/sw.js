// Enhanced service worker with comprehensive browser support and logging
const SW_VERSION = '1.0.8';
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

// Enhanced push event handler with better debugging and platform-specific handling
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received at:', new Date().toISOString());
  console.log('[Service Worker] Raw push data:', event.data ? event.data.text() : 'No data');
  
  if (!event.data) {
    console.warn('[Service Worker] Push event received but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[Service Worker] Push data:', JSON.stringify(data, null, 2));

    // Platform detection for better compatibility
    const userAgent = self.navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(userAgent);
    const isWindows = /windows/.test(userAgent);
    
    // Enhanced notification options with platform-specific tweaks
    const options = {
      body: data.body,
      icon: data.icon || '/favicon.ico',
      badge: data.badge || '/favicon.ico',
      data: {
        ...data.data,
        timestamp: Date.now()
      },
      // Platform-specific vibration patterns
      vibrate: isAndroid ? [100, 50, 100] : [200, 100, 200],
      // Use unique tag per mission type to prevent notification spam
      tag: `mission-${data.data?.mission_type}-${data.data?.mission_id}`,
      // Always renotify even if using same tag
      renotify: true,
      // Keep notification visible until user interaction
      requireInteraction: true,
      // Simplified actions for better cross-platform support
      actions: [
        { action: 'accept', title: '✓' },
        { action: 'decline', title: '✗' }
      ],
      // Enable sound
      silent: false,
      // Add timestamp for ordering
      timestamp: Date.now()
    };

    // Platform-specific customizations
    if (isAndroid) {
      options.priority = 'high';
      options.importance = 'high';
    }
    
    if (isWindows) {
      options.requireInteraction = true; // Windows supports this well
    }

    event.waitUntil(
      (async () => {
        try {
          if (!self.registration.showNotification) {
            console.error('[Service Worker] Notifications not supported');
            throw new Error('Notifications not supported');
          }

          console.log('[Service Worker] Showing notification with options:', JSON.stringify(options, null, 2));
          await self.registration.showNotification(
            data.title || 'Nouvelle mission disponible',
            options
          );
          
          console.log('[Service Worker] Notification shown successfully');
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
