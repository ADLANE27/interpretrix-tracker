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

// Créer un contexte audio persistant
let audioContext = null;

// Fonction pour assurer que le contexte audio est actif
async function ensureAudioContext() {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContext();
  }
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  return audioContext;
}

// Fonction pour jouer le son de manière fiable
async function playNotificationSound(soundUrl) {
  try {
    // Récupérer le son depuis le cache
    const cache = await caches.open('notification-sounds');
    const soundResponse = await cache.match(soundUrl);
    
    if (!soundResponse) {
      throw new Error('Sound not found in cache');
    }

    // Préparer le contexte audio
    const context = await ensureAudioContext();
    
    // Décoder et jouer le son
    const arrayBuffer = await soundResponse.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    
    // Amplifier le son pour une meilleure audibilité
    const gainNode = context.createGain();
    gainNode.gain.value = 1.0; // Volume maximum
    
    // Connecter les nœuds audio
    source.connect(gainNode);
    gainNode.connect(context.destination);
    
    // Démarrer la lecture avec un délai minimal pour éviter les problèmes de timing
    source.start(context.currentTime);
    
    // Garder le contexte actif pendant la durée du son
    return new Promise((resolve) => {
      source.onended = () => {
        setTimeout(resolve, 500); // Ajouter un petit délai après la fin du son
      };
    });
  } catch (error) {
    console.error('[SW] Audio playback error:', error);
    // Fallback avec l'API Audio standard
    try {
      const audio = new Audio(soundUrl);
      audio.volume = 1.0;
      await audio.play();
      return new Promise(resolve => setTimeout(resolve, 3000));
    } catch (fallbackError) {
      console.error('[SW] Fallback audio playback error:', fallbackError);
    }
  }
}

self.addEventListener('push', async (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    // Préparer le son en fonction du type de mission
    const soundUrl = data.data?.mission_type === 'immediate' 
      ? '/sounds/immediate-mission.mp3'
      : '/sounds/scheduled-mission.mp3';

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
        // Utiliser notre nouvelle fonction de lecture audio robuste
        playNotificationSound(soundUrl)
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

// Garder le service worker actif
const keepAliveInterval = 15000; // 15 secondes
let keepAliveTimeout;

function scheduleKeepAlive() {
  if (keepAliveTimeout) {
    clearTimeout(keepAliveTimeout);
  }
  keepAliveTimeout = setTimeout(() => {
    self.registration.active?.postMessage({ type: 'KEEP_ALIVE' });
    scheduleKeepAlive();
  }, keepAliveInterval);
}

// Démarrer le keep-alive dès l'activation
self.addEventListener('activate', () => {
  scheduleKeepAlive();
});

// Gérer les messages du client
self.addEventListener('message', (event) => {
  if (event.data?.type === 'WAKE_UP') {
    ensureAudioContext(); // Réactiver le contexte audio si nécessaire
  }
});
