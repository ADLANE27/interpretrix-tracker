
self.addEventListener('push', event => {
  console.log('[Service Worker] Push Received.');
  console.log('[Service Worker] Push had this data:', event.data?.text());

  try {
    const data = event.data ? JSON.parse(event.data.text()) : {};
    console.log('[Service Worker] Parsed push data:', data);

    if (!data.type || data.type !== 'mission') {
      console.warn('[Service Worker] Received non-mission notification:', data);
      return;
    }

    const options = {
      badge: '/favicon.ico',
      icon: '/favicon.ico',
      vibrate: [200, 100, 200],
      requireInteraction: data.missionType === 'immediate',
      data: {
        url: data.url || '/interpreter',
        missionId: data.missionId,
        missionType: data.missionType,
        startTime: data.startTime,
        endTime: data.endTime
      }
    };

    if (data.missionType === 'immediate') {
      options.title = '🚨 Nouvelle mission immédiate';
      options.vibrate = [200, 100, 200, 100, 200, 100, 200];
    } else {
      options.title = '📅 Nouvelle mission programmée';
    }

    // Format the notification body
    options.body = `${data.sourceLanguage} → ${data.targetLanguage} - ${data.duration} minutes`;
    if (data.startTime) {
      const startTime = new Date(data.startTime).toLocaleString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      options.body += `\nDébut: ${startTime}`;
    }

    console.log('[Service Worker] Showing notification with options:', options);
    event.waitUntil(self.registration.showNotification(options.title, options));
  } catch (error) {
    console.error('[Service Worker] Error processing push notification:', error);
    // Show a fallback notification if something goes wrong
    event.waitUntil(
      self.registration.showNotification('Nouvelle mission disponible', {
        body: 'Ouvrez l\'application pour plus de détails',
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      })
    );
  }
});

self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click received.');

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/interpreter';
  console.log('[Service Worker] Opening URL:', urlToOpen);

  event.waitUntil(
    clients.matchAll({
      type: 'window'
    }).then(windowClients => {
      // Check if there is already a window/tab open with the target URL
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window/tab is already open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('install', event => {
  console.log('[Service Worker] Install event fired');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate event fired');
  event.waitUntil(self.clients.claim());
});
