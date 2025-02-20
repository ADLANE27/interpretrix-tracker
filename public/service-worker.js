
// Register event listener for the 'push' event.
self.addEventListener('push', function(event) {
  console.log('[ServiceWorker] Push Received.');
  console.log('[ServiceWorker] Push had this data:', event.data?.text());

  try {
    const data = event.data?.json() ?? {};
    console.log('[ServiceWorker] Parsed notification data:', data);

    const notificationOptions = {
      body: data.body || 'Nouvelle mission disponible',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.notificationId || 'mission-notification',
      data: {
        ...data,
        url: self.registration.scope,
      },
      requireInteraction: true,
      renotify: true
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Nouvelle mission', notificationOptions)
        .then(() => {
          console.log('[ServiceWorker] Notification shown successfully');
        })
        .catch(error => {
          console.error('[ServiceWorker] Error showing notification:', error);
        })
    );
  } catch (error) {
    console.error('[ServiceWorker] Error processing push:', error);
  }
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  console.log('[ServiceWorker] Notification click received.');

  event.notification.close();

  const notificationData = event.notification.data;
  console.log('[ServiceWorker] Notification data:', notificationData);

  // Add the confirmNotificationDelivery logic
  if (notificationData?.notificationId) {
    fetch(`${self.registration.scope}api/notifications/${notificationData.notificationId}/confirm`, {
      method: 'POST',
    }).catch(error => {
      console.error('[ServiceWorker] Error confirming notification:', error);
    });
  }

  // Navigate to the app when clicked
  event.waitUntil(
    clients.openWindow(notificationData?.url || '/')
  );
});

// Handle notification close
self.addEventListener('notificationclose', function(event) {
  console.log('[ServiceWorker] Notification close received.');
});

