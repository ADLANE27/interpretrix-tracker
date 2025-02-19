
// Type definitions for better code understanding
/* 
interface NotificationPayload {
  type: 'mission';
  missionType: 'immediate' | 'scheduled';
  sourceLanguage: string;
  targetLanguage: string;
  duration: number;
  startTime?: string;
  endTime?: string;
  missionId: string;
  url: string;
}
*/

self.addEventListener('push', event => {
  console.log('[Service Worker] Push Received.');
  
  try {
    // Ensure we have data
    if (!event.data) {
      console.warn('[Service Worker] No data received');
      return;
    }

    console.log('[Service Worker] Raw push data:', event.data.text());
    
    // Parse and validate the data
    const data = JSON.parse(event.data.text());
    console.log('[Service Worker] Parsed push data:', data);

    if (!data.type || data.type !== 'mission') {
      console.warn('[Service Worker] Invalid notification type:', data.type);
      return;
    }

    // Configure notification options based on mission type
    const options = {
      badge: '/favicon.ico',
      icon: '/favicon.ico',
      data: {
        url: data.url || '/interpreter',
        missionId: data.missionId,
        missionType: data.missionType,
        startTime: data.startTime,
        endTime: data.endTime
      },
      requireInteraction: data.missionType === 'immediate',
      vibrate: data.missionType === 'immediate' 
        ? [200, 100, 200, 100, 200, 100, 200] // Urgent pattern
        : [200, 100, 200], // Normal pattern
    };

    // Set title based on mission type
    const title = data.missionType === 'immediate'
      ? '🚨 Nouvelle mission immédiate'
      : '📅 Nouvelle mission programmée';

    // Build notification body
    let body = `${data.sourceLanguage} → ${data.targetLanguage} - ${data.duration} minutes`;
    
    // Add scheduled time information if available
    if (data.startTime) {
      try {
        const startTime = new Date(data.startTime).toLocaleString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        body += `\nDébut: ${startTime}`;
      } catch (dateError) {
        console.error('[Service Worker] Error formatting date:', dateError);
      }
    }

    options.body = body;
    console.log('[Service Worker] Showing notification:', { title, options });

    event.waitUntil(
      self.registration.showNotification(title, options)
        .catch(error => {
          console.error('[Service Worker] Error showing notification:', error);
          // Attempt to show a simpler notification as fallback
          return self.registration.showNotification('Nouvelle mission disponible', {
            body: 'Ouvrez l\'application pour plus de détails',
            icon: '/favicon.ico',
            badge: '/favicon.ico'
          });
        })
    );
  } catch (error) {
    console.error('[Service Worker] Error processing push:', error);
    // Show a fallback notification
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

  // Close the notification
  event.notification.close();

  // Get the target URL from the notification data
  const urlToOpen = event.notification.data?.url || '/interpreter';
  console.log('[Service Worker] Opening URL:', urlToOpen);

  // Handle the click event
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      // Try to find an existing window
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no existing window, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }).catch(error => {
      console.error('[Service Worker] Error handling notification click:', error);
    })
  );
});

self.addEventListener('install', event => {
  console.log('[Service Worker] Install event fired');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate event fired');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clear any old caches if needed
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            return caches.delete(cacheName);
          })
        );
      })
    ])
  );
});
