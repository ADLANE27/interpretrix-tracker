
// Cache name for PWA
const CACHE_NAME = 'interpretrix-v1';

// Listen for push events
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  console.log('[Service Worker] Push had this data:', event.data?.text());

  const options = {
    body: event.data?.text() || 'No payload',
    icon: '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png',
    badge: '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png',
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification('Interprète App', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click received.');

  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});

// Service Worker installation
self.addEventListener('install', function(event) {
  console.log('[Service Worker] Installing Service Worker...', event);
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[Service Worker] Cache Opened');
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json'
      ]);
    })
  );
});

// Service Worker activation
self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Activating Service Worker...', event);
  return self.clients.claim();
});

// Handle fetch events for offline support
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});
