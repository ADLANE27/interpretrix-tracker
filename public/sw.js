
// Service Worker version avec gestion d'erreurs améliorée
const SW_VERSION = '1.4.0';
console.log(`[Service Worker ${SW_VERSION}] Initializing`);

// Configuration des retries
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function retryOperation(operation, maxRetries = MAX_RETRIES) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`[Service Worker] Attempt ${attempt}/${maxRetries} failed:`, error);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }
    }
  }
  throw lastError;
}

// Gestion globale des erreurs
self.addEventListener('error', event => {
  console.error('[Service Worker] Uncaught error:', {
    error: event.error,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    message: event.message
  });
});

self.addEventListener('unhandledrejection', event => {
  console.error('[Service Worker] Unhandled promise rejection:', {
    reason: event.reason,
    stack: event.reason.stack
  });
});

// Installation avec gestion d'erreurs
self.addEventListener('install', event => {
  console.log(`[Service Worker ${SW_VERSION}] Installing`);
  event.waitUntil(
    retryOperation(async () => {
      await self.skipWaiting();
      console.log(`[Service Worker ${SW_VERSION}] Installation completed`);
    })
  );
});

// Activation avec nettoyage robuste
self.addEventListener('activate', event => {
  console.log(`[Service Worker ${SW_VERSION}] Activating`);
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Nettoyage du cache
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== 'v1') {
              console.log(`[Service Worker] Deleting old cache:`, cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ]).then(() => {
      console.log(`[Service Worker ${SW_VERSION}] Activation completed`);
    })
  );
});

// Gestion des messages avec confirmation
self.addEventListener('message', event => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data === 'SKIP_WAITING') {
    console.log('[Service Worker] Skipping wait phase');
    event.waitUntil(
      retryOperation(async () => {
        await self.skipWaiting();
        console.log('[Service Worker] Wait phase skipped successfully');
      })
    );
  }
});

// Gestion améliorée des notifications push
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received at:', new Date().toISOString());
  
  if (!event.data) {
    console.warn('[Service Worker] Push event received but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[Service Worker] Push data:', JSON.stringify(data, null, 2));

    // Validation des données requises
    if (!data.title) {
      throw new Error('Missing notification title');
    }

    const options = {
      body: data.body || 'Nouvelle notification',
      icon: data.icon || '/favicon.ico',
      badge: data.badge || '/favicon.ico',
      data: {
        ...data.data,
        timestamp: Date.now()
      },
      vibrate: data.vibrate || [200, 100, 200],
      tag: data.tag || `mission-${data.data?.mission_id || Date.now()}`,
      renotify: true,
      requireInteraction: true,
      actions: data.actions || [
        { action: 'accept', title: 'Accepter' },
        { action: 'decline', title: 'Décliner' }
      ],
      timestamp: Date.now()
    };

    event.waitUntil(
      retryOperation(async () => {
        if (!self.registration.showNotification) {
          throw new Error('Notifications not supported');
        }

        await self.registration.showNotification(data.title, options);
        console.log('[Service Worker] Notification shown successfully');
      })
    );
  } catch (error) {
    console.error('[Service Worker] Error processing push:', {
      error: error.message,
      stack: error.stack,
      data: event.data?.text()
    });
  }
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification clicked:', {
    tag: event.notification.tag,
    action: event.action
  });

  event.notification.close();

  const urlToOpen = new URL('/', self.location.origin).href;

  event.waitUntil(
    (async () => {
      try {
        const windowClients = await clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });

        // Recherche d'une fenêtre existante
        for (const client of windowClients) {
          if ('focus' in client) {
            await client.focus();
            return;
          }
        }

        // Ouvrir une nouvelle fenêtre si nécessaire
        if (clients.openWindow) {
          await clients.openWindow(urlToOpen);
        }
      } catch (error) {
        console.error('[Service Worker] Error handling click:', error);
      }
    })()
  );
});
