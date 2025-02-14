
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', async (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    console.log('[SW] Push event received:', data);

    const notificationOptions = {
      body: data.body || 'Nouvelle notification',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.data?.mission_id || 'default',
      data: data.data || {},
      vibrate: [200, 100, 200],
      requireInteraction: true,
      renotify: true
    };

    await self.registration.showNotification(
      data.title || 'Nouvelle notification',
      notificationOptions
    );
  } catch (error) {
    console.error('[SW] Error handling push event:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();

  if (event.notification.data?.mission_id) {
    event.waitUntil(
      clients.openWindow(`/interpreter/missions/${event.notification.data.mission_id}`)
    );
  }
});
