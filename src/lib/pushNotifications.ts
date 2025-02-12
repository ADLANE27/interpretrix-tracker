import { supabase } from "@/integrations/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type ServiceWorkerRegistrationStatus = {
  success: boolean;
  registration?: ServiceWorkerRegistration;
  error?: Error;
};

async function waitForServiceWorkerRegistration(registration: ServiceWorkerRegistration): Promise<void> {
  return new Promise((resolve, reject) => {
    // Si le Service Worker est déjà actif, résoudre immédiatement
    if (registration.active) {
      console.log('[Push Notifications] Service Worker already active');
      resolve();
      return;
    }

    // Augmenter le timeout à 30 secondes
    const timeout = setTimeout(() => {
      console.log('[Push Notifications] Service Worker registration timeout - cleaning up');
      cleanup();
      reject(new Error('Service Worker registration timeout'));
    }, 30000);

    // Écouter les changements d'état d'installation
    const handleInstalling = () => {
      console.log('[Push Notifications] Service Worker installing');
    };

    // Écouter les changements d'état d'activation
    const handleActivating = () => {
      console.log('[Push Notifications] Service Worker activating');
    };

    // Écouter les changements d'état actif
    const handleActivated = () => {
      console.log('[Push Notifications] Service Worker activated');
      cleanup();
      resolve();
    };

    // Ajouter tous les listeners
    registration.installing?.addEventListener('statechange', handleInstalling);
    registration.waiting?.addEventListener('statechange', handleActivating);
    registration.active?.addEventListener('statechange', handleActivated);

    // Fonction de nettoyage
    function cleanup() {
      clearTimeout(timeout);
      registration.installing?.removeEventListener('statechange', handleInstalling);
      registration.waiting?.removeEventListener('statechange', handleActivating);
      registration.active?.removeEventListener('statechange', handleActivated);
    }
  });
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  try {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    // Suppression des anciens service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));
    
    // Attendre un peu pour s'assurer que tout est nettoyé
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Enregistrer le nouveau service worker
    console.log('[Push Notifications] Registering new service worker');
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      type: 'module'
    });

    // Attendre que le service worker soit actif
    await new Promise<void>((resolve, reject) => {
      if (registration.active) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Service Worker registration timeout'));
      }, 10000);

      registration.addEventListener('activate', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    return registration;
  } catch (error) {
    console.error('[Push Notifications] Registration failed:', error);
    throw error;
  }
}

export async function subscribeToPushNotifications(interpreterId: string): Promise<boolean> {
  try {
    console.log('[Push Notifications] Starting subscription process');

    const permissionResult = await Notification.requestPermission();
    if (permissionResult !== 'granted') {
      throw new Error(`Permission not granted: ${permissionResult}`);
    }

    const registration = await registerServiceWorker();
    if (!registration) {
      throw new Error('Failed to register service worker');
    }

    const { data: vapidData, error: vapidError } = await supabase.functions.invoke(
      'get-vapid-public-key',
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (vapidError || !vapidData?.vapidPublicKey) {
      throw new Error('Failed to get VAPID key');
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidData.vapidPublicKey);

    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      await existingSubscription.unsubscribe();
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    const subscriptionJSON = subscription.toJSON();

    const { error: insertError } = await supabase
      .from('push_subscriptions')
      .upsert({
        interpreter_id: interpreterId,
        endpoint: subscriptionJSON.endpoint,
        p256dh: subscriptionJSON.keys.p256dh,
        auth: subscriptionJSON.keys.auth,
        user_agent: navigator.userAgent,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'interpreter_id,endpoint'
      });

    if (insertError) {
      throw insertError;
    }

    return true;
  } catch (error) {
    console.error('[Push Notifications] Subscription error:', error);
    throw error;
  }
}

export async function unsubscribeFromPushNotifications(interpreterId: string): Promise<boolean> {
  try {
    console.log('[Push Notifications] Starting unsubscribe process');
    
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      console.log('[Push Notifications] Found existing subscription');
      await subscription.unsubscribe();
      console.log('[Push Notifications] Unsubscribed from browser');

      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('interpreter_id', interpreterId)
        .eq('endpoint', subscription.endpoint);

      if (error) {
        console.error('[Push Notifications] Database error:', error);
        throw error;
      }
      console.log('[Push Notifications] Subscription removed from database');
    }

    // Toujours désinscrire le service worker
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));
    console.log('[Push Notifications] Service worker unregistered');

    return true;
  } catch (error) {
    console.error('[Push Notifications] Unsubscribe error:', error);
    throw error;
  }
}

export async function sendTestNotification(interpreterId: string) {
  try {
    console.log('[Push Notifications] Sending test notification');
    const { data, error } = await supabase.functions.invoke(
      'send-push-notification',
      {
        method: 'POST',
        body: {
          message: {
            interpreterIds: [interpreterId],
            title: 'Test de notification',
            body: 'Cette notification est un test pour vérifier que tout fonctionne correctement.',
            data: {
              mission_type: 'test',
              source_language: 'Test',
              target_language: 'Test',
              estimated_duration: 1,
              url: '/',
              mission_id: 'test'
            }
          }
        }
      }
    );

    if (error) {
      console.error('[Push Notifications] Test notification error:', error);
      throw error;
    }
    
    console.log('[Push Notifications] Test notification sent successfully');
    return data;
  } catch (error) {
    console.error('[Push Notifications] Test notification error:', error);
    throw error;
  }
}
