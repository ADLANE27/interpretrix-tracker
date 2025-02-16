const CACHE_NAME = 'interpreter-app-v1';
const OFFLINE_URL = '/offline.html';

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
    })()
  );
});

// Fetch event - handle offline functionality
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  event.respondWith(
    (async () => {
      // Try to get the resource from the network
      try {
        const networkResponse = await fetch(request);
        
        // Save successful responses in cache
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        // If network fails, try to get from cache
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
          return cachedResponse;
        }

        // If resource isn't in cache, return offline page for document requests
        if (request.mode === 'navigate') {
          const cache = await caches.open(CACHE_NAME);
          return cache.match(OFFLINE_URL);
        }

        // Otherwise just throw the error
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
