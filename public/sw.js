self.addEventListener('push', event => {
  console.log('Push message received:', event);
  
  if (event.data) {
    const data = event.data.json();
    
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

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Ouvrir ou focus l'application
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});

// Gérer les erreurs de notification
self.addEventListener('notificationerror', event => {
  console.error('Notification error:', event.error);
});