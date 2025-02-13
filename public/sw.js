
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
    
    // Préparer le son en fonction du type de mission
    const soundUrl = data.data?.mission_type === 'immediate' 
      ? '/sounds/immediate-mission.mp3'
      : '/sounds/scheduled-mission.mp3';

    // Récupérer le son depuis le cache
    const cache = await caches.open('notification-sounds');
    const soundResponse = await cache.match(soundUrl);
    
    if (soundResponse) {
      const audioContext = new AudioContext();
      const audioBuffer = await soundResponse.arrayBuffer();
      await audioContext.decodeAudioData(audioBuffer);
    }

    const options = {
      body: data.body || 'Nouvelle notification',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.data?.mission_id || 'default',
      data: data.data || {},
      vibrate: [200, 100, 200, 100, 200],
      sound: soundUrl,
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: 'Ouvrir',
        }
      ]
    };

    event.waitUntil(
      Promise.all([
        self.registration.showNotification(
          data.title || 'Nouvelle mission', 
          options
        ),
        // Assurer que le son est joué même en veille
        new Promise(async (resolve) => {
          try {
            const audio = new Audio(soundUrl);
            audio.volume = 1.0;
            await audio.play();
            // Garder l'audio en lecture pendant au moins 3 secondes
            setTimeout(resolve, 3000);
          } catch (error) {
            console.error('[SW] Error playing sound:', error);
            resolve();
          }
        })
      ])
    );
  } catch (error) {
    console.error('[SW] Push error:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    if (event.notification.data?.mission_id) {
      event.waitUntil(
        clients.openWindow(`/interpreter/missions/${event.notification.data.mission_id}`)
      );
    }
  }
});

// Gérer la perte de focus
self.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // Garder le service worker actif
    self.registration.active?.postMessage({ type: 'KEEP_ALIVE' });
  }
});

// Maintenir la connexion active
setInterval(() => {
  self.registration.active?.postMessage({ type: 'KEEP_ALIVE' });
}, 20000);
