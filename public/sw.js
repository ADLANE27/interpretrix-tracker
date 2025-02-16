
const CACHE_NAME = 'interpreter-app-v1';
const OFFLINE_URL = '/offline.html';
const SYNC_TAG = 'interpreter-sync';

// Assets to cache
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/offline.html',
  '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png',
  '/sounds/immediate-mission.mp3',
  '/sounds/scheduled-mission.mp3'
];

// Install event - cache initial assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS_TO_CACHE);
      await (self as any).skipWaiting();
    })()
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys.map(async (key) => {
          if (key !== CACHE_NAME) {
            await caches.delete(key);
          }
        })
      );
      await (self as any).clients.claim();

      // Register for periodic sync if supported
      try {
        if ('periodicSync' in registration) {
          const status = await navigator.permissions.query({
            name: 'periodic-background-sync',
          } as PermissionDescriptor);

          if (status.state === 'granted') {
            await registration.periodicSync.register(SYNC_TAG, {
              minInterval: 60 * 1000, // Minimum 1 minute
            });
          }
        }
      } catch (error) {
        console.error('Periodic sync registration failed:', error);
      }
    })()
  );
});

// Sync event - handle background sync
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncInterpreterData());
  }
});

// Periodic sync event - handle periodic background sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncInterpreterData());
  }
});

// Function to sync interpreter data
async function syncInterpreterData() {
  try {
    const response = await fetch('/api/interpreters/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error('Sync failed');

    const data = await response.json();
    
    // Update all clients with new data
    const clients = await (self as any).clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        data: data
      });
    });

    return data;
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}

// Fetch event - handle offline functionality and network-first strategy for API requests
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Special handling for API requests
  if (request.url.includes('/api/')) {
    event.respondWith(
      (async () => {
        try {
          // Try network first
          const networkResponse = await fetch(request);
          
          // Clone the response before using it
          const responseToCache = networkResponse.clone();
          
          // Cache the response for offline use
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, responseToCache);
          
          return networkResponse;
        } catch (error) {
          // If network fails, try cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            // Schedule a background sync
            try {
              await registration.sync.register(SYNC_TAG);
            } catch (e) {
              console.error('Background sync registration failed:', e);
            }
            return cachedResponse;
          }
          throw error;
        }
      })()
    );
    return;
  }

  // Default fetch handling for non-API requests
  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        if (request.mode === 'navigate') {
          const cache = await caches.open(CACHE_NAME);
          return cache.match(OFFLINE_URL);
        }
        throw error;
      }
    })()
  );
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png',
      badge: '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png',
      data: data.data || {},
      vibrate: [200, 100, 200],
    })
  );
});

// Notification click event - handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    (async () => {
      const allClients = await (self as any).clients.matchAll({
        includeUncontrolled: true,
        type: 'window',
      });

      // If we have an open window, focus it
      if (allClients.length > 0) {
        await allClients[0].focus();
        return;
      }

      // Otherwise open a new window
      await (self as any).clients.openWindow('/');
    })()
  );
});
