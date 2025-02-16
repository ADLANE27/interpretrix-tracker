
// Service Worker version
const SW_VERSION = '1.0.0';

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing new version:', SW_VERSION);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating new version:', SW_VERSION);
  return self.clients.claim();
});

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received:', event);

  try {
    const data = event.data.json();
    console.log('[Service Worker] Push data:', data);

    const options = {
      body: data.body,
      icon: data.icon || '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png',
      badge: data.badge || '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png',
      data: {
        ...data.data,
        url: self.registration.scope,
      },
      tag: data.tag || 'default',
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200],
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('[Service Worker] Error handling push:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);

  try {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(urlToOpen);
      })
    );
  } catch (error) {
    console.error('[Service Worker] Error handling notification click:', error);
  }
});

