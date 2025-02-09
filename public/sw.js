
const SW_VERSION = '1.0.13';
console.log(`[Service Worker ${SW_VERSION}] Initializing`);

self.addEventListener('error', event => {
  console.error('[Service Worker] Uncaught error:', event.error);
  console.error('[Service Worker] Stack:', event.error.stack);
  console.error('[Service Worker] Message:', event.error.message);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[Service Worker] Unhandled promise rejection:', event.reason);
  if (event.reason.stack) {
    console.error('[Service Worker] Stack:', event.reason.stack);
  }
});

self.addEventListener('push', event => {
  console.log('[Service Worker] Push received:', event);
  
  if (!(self.Notification && self.Notification.permission === 'granted')) {
    console.error('[Service Worker] Push received but notifications not supported/permitted');
    return;
  }

  try {
    const data = event.data?.json() ?? {};
    console.log('[Service Worker] Push data:', data);

    const options = {
      body: `${data.source_language} → ${data.target_language} - ${data.estimated_duration} minutes`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: data,
      vibrate: [200],
      tag: `mission-${data.mission_type}-${data.id}`,
      renotify: true,
      requireInteraction: true,
      actions: [
        { action: 'accept', title: '✓' },
        { action: 'decline', title: '✗' }
      ],
      silent: false,
      timestamp: Date.now()
    };

    event.waitUntil(
      self.registration.showNotification(
        data.mission_type === 'immediate' ? 
          '🚨 Nouvelle mission immédiate' : 
          '📅 Nouvelle mission programmée',
        options
      )
    );
  } catch (error) {
    console.error('[Service Worker] Error handling push:', error);
    console.error('[Service Worker] Stack:', error.stack);
  }
});

self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification clicked:', {
    action: event.action,
    notification: {
      tag: event.notification.tag,
      data: event.notification.data
    }
  });
  
  event.notification.close();

  if (event.action === 'decline') {
    console.log('[Service Worker] Mission declined');
    return;
  }

  event.waitUntil(
    (async () => {
      try {
        // Always use HTTPS for the URL
        const urlToOpen = self.location.origin.replace('http:', 'https:') + '/';

        const windowClients = await clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });

        // Try to focus an existing window first
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            await client.focus();
            return;
          }
        }

        // If no existing window, open a new one
        if (clients.openWindow) {
          await clients.openWindow(urlToOpen);
        }
      } catch (error) {
        console.error('[Service Worker] Error handling notification click:', error);
      }
    })()
  );
});

self.addEventListener('install', event => {
  console.log(`[Service Worker ${SW_VERSION}] Installing`);
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log(`[Service Worker ${SW_VERSION}] Activating`);
  event.waitUntil(self.clients.claim());
});
