self.addEventListener('push', event => {
  console.log('[Service Worker] Push message received:', event);
  
  if (event.data) {
    const data = event.data.json();
    console.log('[Service Worker] Push data:', data);
    
    const options = {
      body: data.body,
      icon: data.icon || '/favicon.ico',
      badge: '/favicon.ico',
      data: data.data || {},
      requireInteraction: true,
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'open',
          title: 'Voir la mission'
        },
        {
          action: 'close',
          title: 'Fermer'
        }
      ]
    };

    console.log('[Service Worker] Showing notification with options:', options);

    event.waitUntil(
      self.registration.showNotification(data.title, options)
        .then(() => {
          console.log('[Service Worker] Notification shown successfully');
        })
        .catch(error => {
          console.error('[Service Worker] Error showing notification:', error);
        })
    );
  }
});

self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Ouvrir ou focus l'application
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      console.log('[Service Worker] Found clients:', clientList);
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        console.log('[Service Worker] Focusing client:', client);
        return client.focus();
      }
      console.log('[Service Worker] Opening new window');
      return clients.openWindow('/');
    })
  );
});

self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker:', event);
});

self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker:', event);
});

// Gérer les erreurs de notification
self.addEventListener('notificationerror', event => {
  console.error('[Service Worker] Notification error:', event.error);
});