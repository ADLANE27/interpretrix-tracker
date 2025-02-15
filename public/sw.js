// Cache name for PWA
const CACHE_NAME = 'interpretrix-v1';

// Listen for push events
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');

  let notificationData;
  try {
    notificationData = event.data?.json();
    console.log('[Service Worker] Push data:', notificationData);
  } catch (e) {
    console.error('[Service Worker] Error parsing push data:', e);
    notificationData = {
      title: 'Nouvelle notification',
      body: event.data?.text() || 'No payload',
    };
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png',
    badge: notificationData.badge || '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png',
    data: notificationData.data || {},
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Voir la mission'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title || 'Interprète App', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click received.');

  event.notification.close();

  // Add custom handling based on notification data
  const urlToOpen = new URL('/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // If a tab matching the URL is already open, focus it
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no matching tab exists, open a new one
      return clients.openWindow(urlToOpen);
    })
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
