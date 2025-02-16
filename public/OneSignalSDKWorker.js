importScripts("https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js");

self.addEventListener('push', function(event) {
  console.log('[ServiceWorker] Push Received.');
  console.log('[ServiceWorker] Push had this data:', event.data?.text());
});

self.addEventListener('notificationclick', function(event) {
  console.log('[ServiceWorker] Notification click received.');
  event.notification.close();
  
  // Focus or open window on notification click
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if ('focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Keep the service worker alive and handle fetch events
self.addEventListener('fetch', function(event) {
  // No need to handle the fetch event
  // This is just to keep the service worker active
});

// Handle installation
self.addEventListener('install', function(event) {
  console.log('[ServiceWorker] Installing...');
  self.skipWaiting();
});

// Handle activation
self.addEventListener('activate', function(event) {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(self.clients.claim());
});
