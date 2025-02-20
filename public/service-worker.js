
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  console.log('[Service Worker] Push had this data:', event.data.text());

  try {
    const data = JSON.parse(event.data.text());
    const notificationTitle = data.title || 'Nouvelle notification';
    const notificationOptions = {
      body: data.body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: data, // Store the entire data object for use in click handler
      tag: data.notificationId // Use the notification ID as the tag
    };

    // Play sound based on mission type if it's a mission notification
    if (data.type === 'mission') {
      notificationOptions.sound = data.missionType === 'immediate' 
        ? '/sounds/immediate-mission.mp3' 
        : '/sounds/scheduled-mission.mp3';
    }

    event.waitUntil(
      Promise.all([
        // Show the notification
        self.registration.showNotification(notificationTitle, notificationOptions),
        
        // Confirm delivery if we have a notification ID
        data.notificationId ? fetch('https://bblpiatmtnlhnbavhkau.supabase.co/functions/v1/confirm-notification-delivery', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            notificationId: data.notificationId,
            deliveredAt: new Date().toISOString()
          })
        }).then(response => {
          if (!response.ok) {
            throw new Error('Failed to confirm notification delivery');
          }
          console.log('[Service Worker] Delivery confirmed for notification:', data.notificationId);
        }).catch(error => {
          console.error('[Service Worker] Error confirming delivery:', error);
        }) : Promise.resolve()
      ])
    );
  } catch (error) {
    console.error('[Service Worker] Error processing push:', error);
  }
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click received.');
  
  const notification = event.notification;
  const data = notification.data;
  notification.close();

  // Determine the URL based on notification type
  let url = '/';
  if (data?.type === 'mission') {
    url = `/missions/${data.missionId}`;
  }

  // Focus or open window
  event.waitUntil(
    clients.matchAll({
      type: "window"
    }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === url && 'focus' in client)
          return client.focus();
      }
      if (clients.openWindow)
        return clients.openWindow(url);
    })
  );
});
