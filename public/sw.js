
// Service Worker for Push Notifications
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('notification-sounds').then((cache) => {
      return cache.addAll([
        '/sounds/immediate-mission.mp3',
        '/sounds/scheduled-mission.mp3'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', async (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    console.log('[SW] Push event received:', data);

    // Formater le corps de la notification en fonction du type de mission
    let body = '';
    if (data.data?.mission_type === 'immediate') {
      body = `Mission immédiate\n${data.data.source_language} → ${data.data.target_language}\n${data.data.estimated_duration} minutes`;
    } else if (data.data?.mission_type === 'scheduled') {
      const start = new Date(data.data.scheduled_start_time);
      const end = new Date(data.data.scheduled_end_time);
      body = `Mission programmée\n${data.data.source_language} → ${data.data.target_language}\n${start.toLocaleString()} - ${end.toLocaleString()}`;
    }
    
    // Configurer les options de notification
    const options = {
      body: body || 'Nouvelle mission disponible',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.data?.mission_id || 'default',
      data: {
        mission_id: data.data?.mission_id,
        url: `/interpreter/missions/${data.data?.mission_id}`
      },
      vibrate: [200, 100, 200],
      silent: false, // Utiliser le son système par défaut
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: 'Voir la mission',
        }
      ]
    };
    
    // Afficher la notification avec les détails de la mission
    console.log('[SW] Showing notification with options:', options);
    await self.registration.showNotification(
      data.data?.mission_type === 'immediate' ? '🚨 Nouvelle mission immédiate' : '📅 Nouvelle mission programmée',
      options
    );
  } catch (error) {
    console.error('[SW] Push error:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Gérer les messages du client
self.addEventListener('message', async (event) => {
  if (event.data?.type === 'WAKE_UP') {
    console.log('[SW] Received wake-up message');
  }
});
