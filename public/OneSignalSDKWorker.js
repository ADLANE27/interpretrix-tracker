
importScripts("https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js");

self.addEventListener('push', function(event) {
  console.log('[ServiceWorker] Push Received.');
  console.log('[ServiceWorker] Push had this data:', event.data.text());
});

self.addEventListener('notificationclick', function(event) {
  console.log('[ServiceWorker] Notification click received.');
  event.notification.close();
});
