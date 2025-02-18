
// Cache name
const CACHE_NAME = 'aftraduction-cache-v1';

// Assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('[Service Worker] Cache failed:', error);
      })
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('[Service Worker] Push reçu mais pas de données');
    return;
  }

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'Nouvelle notification',
      icon: '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png',
      badge: '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png',
      data: {
        url: data.url || '/',
        ...data.data
      },
      actions: data.actions || [],
      vibrate: [200, 100, 200],
      tag: data.tag || 'default',
      renotify: true,
      requireInteraction: true
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || 'AFTraduction',
        options
      )
    );
  } catch (error) {
    console.error('[Service Worker] Erreur lors du traitement de la notification:', error);
  }
});

// Gestion du clic sur la notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // URL par défaut ou URL spécifiée dans la notification
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then((windowClients) => {
      // Chercher si une fenêtre est déjà ouverte
      const matchingClient = windowClients.find((client) => {
        const url = new URL(client.url);
        return url.pathname === urlToOpen;
      });

      if (matchingClient) {
        // Si une fenêtre existe, la focus
        return matchingClient.focus();
      }

      // Sinon, ouvrir une nouvelle fenêtre
      return clients.openWindow(urlToOpen);
    })
    .catch((error) => {
      console.error('[Service Worker] Erreur lors de la redirection:', error);
    })
  );
});

// Stratégie de cache pour les requêtes
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retourner la réponse du cache si elle existe
        if (response) {
          return response;
        }
        // Sinon faire la requête réseau
        return fetch(event.request);
      })
      .catch((error) => {
        console.error('[Service Worker] Fetch failed:', error);
      })
  );
});
