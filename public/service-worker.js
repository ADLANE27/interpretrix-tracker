
// Cache name
const CACHE_NAME = 'translator-cache-v1';

// URLs to cache
const urlsToCache = [
  '/',
  '/index.html',
  '/sounds/immediate-mission.mp3',
  '/sounds/scheduled-mission.mp3'
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[Service Worker] Cache error:', error);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  console.log('[Service Worker] Push had this data:', event.data?.text());

  const options = {
    body: 'Nouvelle mission disponible',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  try {
    if (event.data) {
      const data = event.data.json();
      console.log('[Service Worker] Notification data:', data);

      // Customize notification based on mission type
      if (data.type === 'mission') {
        options.body = `${data.sourceLanguage} → ${data.targetLanguage} - ${data.duration} minutes`;
        options.data = {
          url: '/interpreter',
          ...data
        };
        
        if (data.missionType === 'immediate') {
          options.title = '🚨 Nouvelle mission immédiate';
          options.requireInteraction = true;
        } else {
          options.title = '📅 Nouvelle mission programmée';
        }
      } else {
        options.title = data.title || 'Nouvelle notification';
        options.body = data.body || options.body;
        if (data.data) {
          options.data = { ...options.data, ...data.data };
        }
      }
    }
  } catch (error) {
    console.error('[Service Worker] Error parsing notification data:', error);
  }

  event.waitUntil(
    self.registration.showNotification(options.title || 'Nouvelle notification', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click received.');

  event.notification.close();

  let url = '/';
  if (event.notification.data && event.notification.data.url) {
    url = event.notification.data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(function(windowClients) {
        // Check if there is already a window/tab open with the target URL
        for (var i = 0; i < windowClients.length; i++) {
          var client = windowClients[i];
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window/tab is already open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

