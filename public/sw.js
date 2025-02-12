
// Service Worker version avec gestion simplifiée
const SW_VERSION = '1.5.0';
console.log(`[Service Worker ${SW_VERSION}] Initializing`);

// Installation immédiate
self.addEventListener('install', event => {
  console.log(`[Service Worker ${SW_VERSION}] Installing`);
  self.skipWaiting();
});

// Activation et prise de contrôle
self.addEventListener('activate', event => {
  console.log(`[Service Worker ${SW_VERSION}] Activating`);
  event.waitUntil(self.clients.claim());
});

// Gestion des notifications push
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received:', event.data?.text());
  
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'Nouvelle notification',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `mission-${Date.now()}`,
      data: data.data || {},
      renotify: true,
      requireInteraction: true,
      actions: [
        { action: 'accept', title: 'Accepter' },
        { action: 'decline', title: 'Décliner' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Notification', options)
    );
  } catch (error) {
    console.error('[Service Worker] Push error:', error);
  }
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
