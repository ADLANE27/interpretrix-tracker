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
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Précharger les contextes audio dès l'activation
      initializeAudioContexts()
    ])
  );
});

// Gérer plusieurs contextes audio pour plus de fiabilité
const audioContexts = new Set();
const MAX_CONTEXTS = 3;

async function initializeAudioContexts() {
  try {
    for (let i = 0; i < MAX_CONTEXTS; i++) {
      const context = new AudioContext();
      await context.resume();
      audioContexts.add(context);
    }
    console.log('[SW] Audio contexts initialized:', audioContexts.size);
  } catch (error) {
    console.error('[SW] Error initializing audio contexts:', error);
  }
}

// Obtenir un contexte audio disponible
async function getAvailableAudioContext() {
  // Chercher un contexte qui n'est pas en cours d'utilisation
  for (const context of audioContexts) {
    if (context.state !== 'running') {
      await context.resume();
      return context;
    }
  }
  
  // Si tous les contextes sont occupés, en créer un nouveau
  if (audioContexts.size < MAX_CONTEXTS) {
    const newContext = new AudioContext();
    await newContext.resume();
    audioContexts.add(newContext);
    return newContext;
  }
  
  // Utiliser le premier contexte disponible si on a atteint la limite
  const context = audioContexts.values().next().value;
  await context.resume();
  return context;
}

// Cache pour les buffers audio décodés
const audioBufferCache = new Map();

// Fonction pour jouer le son de manière fiable
async function playNotificationSound(soundUrl) {
  console.log('[SW] Starting sound playback:', soundUrl);
  
  try {
    // Vérifier le cache des buffers
    let audioBuffer = audioBufferCache.get(soundUrl);
    
    if (!audioBuffer) {
      // Récupérer le son depuis le cache
      const cache = await caches.open('notification-sounds');
      const soundResponse = await cache.match(soundUrl);
      
      if (!soundResponse) {
        throw new Error('Sound not found in cache');
      }

      // Décoder le son
      const context = await getAvailableAudioContext();
      const arrayBuffer = await soundResponse.arrayBuffer();
      audioBuffer = await context.decodeAudioData(arrayBuffer);
      
      // Mettre en cache le buffer décodé
      audioBufferCache.set(soundUrl, audioBuffer);
    }

    // Créer un nouveau contexte pour la lecture
    const playbackContext = await getAvailableAudioContext();
    console.log('[SW] Using audio context:', playbackContext.state);
    
    // Configurer la chaîne audio
    const source = playbackContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Amplifier le son
    const gainNode = playbackContext.createGain();
    gainNode.gain.value = 1.0;
    
    // Compresseur pour éviter la distorsion
    const compressor = playbackContext.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    
    // Connecter la chaîne audio
    source.connect(gainNode);
    gainNode.connect(compressor);
    compressor.connect(playbackContext.destination);
    
    // Démarrer la lecture
    source.start(0);
    
    console.log('[SW] Sound playback started');
    
    return new Promise((resolve) => {
      source.onended = () => {
        console.log('[SW] Sound playback ended');
        setTimeout(resolve, 500);
      };
    });
  } catch (error) {
    console.error('[SW] Audio playback error:', error);
    
    // Fallback aggressif avec l'API Audio standard
    try {
      console.log('[SW] Attempting fallback playback');
      const audio = new Audio(soundUrl);
      audio.volume = 1.0;
      
      // Forcer le son à se jouer même en mode silencieux
      audio.setAttribute('webkit-playsinline', 'true');
      audio.setAttribute('playsinline', 'true');
      audio.muted = false;
      
      await audio.play();
      console.log('[SW] Fallback playback started');
      
      return new Promise(resolve => {
        audio.onended = () => {
          console.log('[SW] Fallback playback ended');
          resolve();
        };
        // Backup timeout au cas où onended ne se déclenche pas
        setTimeout(resolve, 5000);
      });
    } catch (fallbackError) {
      console.error('[SW] Fallback audio playback error:', fallbackError);
    }
  }
}

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
      body: body || data.body || 'Nouvelle mission disponible',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.data?.mission_id || 'default',
      data: data.data || {},
      vibrate: [200, 100, 200],
      requireInteraction: true,
      silent: false, // S'assurer que le son du système est activé
      actions: [
        {
          action: 'open',
          title: 'Voir la mission',
        }
      ],
      timestamp: Date.now() // Ajouter un timestamp pour s'assurer que la notification est considérée comme nouvelle
    };

    // Jouer le son de notification
    const soundUrl = data.data?.mission_type === 'immediate' 
      ? '/sounds/immediate-mission.mp3'
      : '/sounds/scheduled-mission.mp3';
    
    console.log('[SW] Playing notification sound');
    await playNotificationSound(soundUrl);
    
    // Créer la notification système
    console.log('[SW] Showing notification with options:', options);
    const notification = await self.registration.showNotification(
      data.title || (data.data?.mission_type === 'immediate' ? '🚨 Nouvelle mission immédiate' : '📅 Nouvelle mission programmée'),
      options
    );

    // Vérifier que la notification a bien été créée
    console.log('[SW] Notification created:', notification);

  } catch (error) {
    console.error('[SW] Push error:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(`/interpreter/missions/${event.notification.data.mission_id}`)
    );
  }
});

// Système de keep-alive plus robuste
const KEEP_ALIVE_INTERVAL = 10000; // 10 secondes
let keepAliveInterval;

function startKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  
  keepAliveInterval = setInterval(async () => {
    try {
      const allClients = await clients.matchAll();
      if (allClients.length > 0) {
        console.log('[SW] Sending keep-alive to', allClients.length, 'clients');
        allClients.forEach(client => {
          client.postMessage({ type: 'KEEP_ALIVE' });
        });
        
        // Réactiver les contextes audio
        for (const context of audioContexts) {
          if (context.state === 'suspended') {
            await context.resume();
          }
        }
      }
    } catch (error) {
      console.error('[SW] Keep-alive error:', error);
    }
  }, KEEP_ALIVE_INTERVAL);
}

// Démarrer le keep-alive dès l'activation
self.addEventListener('activate', () => {
  startKeepAlive();
});

// Gérer les messages du client
self.addEventListener('message', async (event) => {
  if (event.data?.type === 'WAKE_UP') {
    console.log('[SW] Received wake-up message');
    try {
      // Réactiver tous les contextes audio
      for (const context of audioContexts) {
        if (context.state === 'suspended') {
          await context.resume();
          console.log('[SW] Resumed audio context:', context.state);
        }
      }
    } catch (error) {
      console.error('[SW] Error resuming audio contexts:', error);
    }
  }
});
