
importScripts("https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js");

self.addEventListener('push', function(event) {
  console.log('[ServiceWorker] Push Received.');
  console.log('[ServiceWorker] Push had this data:', event.data?.text());
});

self.addEventListener('notificationclick', function(event) {
  console.log('[ServiceWorker] Notification click received.');
  event.notification.close();
  
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

self.addEventListener('install', function(event) {
  console.log('[ServiceWorker] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(self.clients.claim());
});
