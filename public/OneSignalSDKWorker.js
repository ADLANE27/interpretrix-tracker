
importScripts("https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js");

// Enhanced logging for debugging
console.log('[ServiceWorker] Worker script loaded');

self.addEventListener('install', function(event) {
  console.log('[ServiceWorker] Installing new service worker...');
  event.waitUntil(self.skipWaiting()); // Ensures that the service worker activates immediately
});

self.addEventListener('activate', function(event) {
  console.log('[ServiceWorker] Service worker activated');
  event.waitUntil(self.clients.claim()); // Take control of all clients immediately
});

self.addEventListener('push', function(event) {
  console.log('[ServiceWorker] Push Received.');
  console.log('[ServiceWorker] Push had this data:', event.data?.text());

  // Ensure the event doesn't end before the notification is shown
  event.waitUntil(
    self.registration.showNotification('Interpretix', {
      body: event.data?.text() || 'Nouvelle notification',
      icon: '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png',
      badge: '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png',
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[ServiceWorker] Notification click received.');
  
  event.notification.close();

  // This ensures the service worker doesn't terminate before the promise resolves
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(function(clientList) {
      if (clientList.length > 0) {
        // If we have a client, focus it
        return clientList[0].focus();
      }
      // If no client is open, open a new one
      return clients.openWindow('/');
    })
  );
});

// Handle errors
self.addEventListener('error', function(event) {
  console.error('[ServiceWorker] Error:', event.error);
});

