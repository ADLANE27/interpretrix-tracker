
// Service Worker version
const SW_VERSION = '1.1.0';
console.log(`[Service Worker ${SW_VERSION}] Starting`);

self.addEventListener('install', event => {
  console.log(`[Service Worker ${SW_VERSION}] Installing`);
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log(`[Service Worker ${SW_VERSION}] Activating`);
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  console.log('[Service Worker] Push received:', event.data?.text());
  
  if (!event.data) {
    console.warn('[Service Worker] No data in push event');
    return;
  }

  try {
    const data = event.data.json();
    
    // Default notification options
    const options = {
      body: data.body || 'Nouvelle notification',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: data.data || {},
      vibrate: [100, 50, 100],
      requireInteraction: true,
      actions: []
    };

    // Add actions based on notification type
    if (data.data?.mission_id) {
      options.actions = [
        {
          action: 'view',
          title: 'Voir la mission'
        },
        {
          action: 'dismiss',
          title: 'Ignorer'
        }
      ];
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'Notification', options)
    );
  } catch (error) {
    console.error('[Service Worker] Push error:', error);
  }
});

self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'view' && event.notification.data?.mission_id) {
    // Open the mission details page
    const missionUrl = `/interpreter/missions/${event.notification.data.mission_id}`;
    
    event.waitUntil(
      clients.openWindow(missionUrl)
    );
  }
});
