
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  console.log('[Service Worker] Push had this data:', event.data.text());

  try {
    const data = JSON.parse(event.data.text());
    const notificationData = {
      ...data,
      icon: '/favicon.ico',
      badge: '/favicon.ico'
    };

    // Play sound based on mission type if it's a mission notification
    if (data.type === 'mission') {
      notificationData.sound = data.missionType === 'immediate' 
        ? '/sounds/immediate-mission.mp3' 
        : '/sounds/scheduled-mission.mp3';
    }

    event.waitUntil(
      self.registration.showNotification(
        data.title || 'Nouvelle notification',
        notificationData
      ).then(() => {
        // Confirm delivery if we have a notification ID
        if (data.notificationId) {
          return fetch('https://bblpiatmtnlhnbavhkau.supabase.co/functions/v1/confirm-notification-delivery', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ notificationId: data.notificationId })
          });
        }
      })
    );
  } catch (error) {
    console.error('[Service Worker] Error processing push:', error);
  }
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click received.');

  event.notification.close();

  // Add navigation logic based on notification type
  const data = event.notification.data;
  let url = '/';

  if (data?.type === 'mission') {
    url = `/missions/${data.missionId}`;
  }

  event.waitUntil(
    clients.openWindow(url)
  );
});
