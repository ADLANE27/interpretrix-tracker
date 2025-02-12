
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
    if (registration.active) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error('Service Worker registration timeout'));
    }, 10000);

    const handleStateChange = () => {
      if (registration.active) {
        cleanup();
        resolve();
      }
    };

    registration.addEventListener('statechange', handleStateChange);

    function cleanup() {
      clearTimeout(timeout);
      registration.removeEventListener('statechange', handleStateChange);
    }
  });
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistrationStatus> {
  try {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    // Nettoyage des anciens service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }

    // Attendre un court délai avant d'enregistrer le nouveau service worker
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Enregistrer le nouveau service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      type: 'module',
      updateViaCache: 'none'
    });

    console.log('[Push Notifications] Service Worker registered:', {
      scope: registration.scope,
      state: registration.active?.state
    });

    // Attendre que le service worker soit prêt
    await waitForServiceWorkerRegistration(registration);

    return { success: true, registration };
  } catch (error) {
    console.error('[Push Notifications] Service Worker registration failed:', {
      error,
      message: error.message,
      stack: error.stack
    });
    return { success: false, error: error as Error };
  }
}

export async function subscribeToPushNotifications(interpreterId: string): Promise<boolean> {
  try {
    console.log('[Push Notifications] Starting subscription process');

    // Demander la permission en premier
    const permissionResult = await Notification.requestPermission();
    if (permissionResult !== 'granted') {
      throw new Error(`Permission not granted: ${permissionResult}`);
    }

    // Enregistrer le service worker
    const swResult = await registerServiceWorker();
    if (!swResult.success || !swResult.registration) {
      throw new Error('Failed to register service worker');
    }

    // Attendre un court délai pour s'assurer que le service worker est actif
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Récupérer la clé VAPID
    const { data: vapidData, error: vapidError } = await supabase.functions.invoke(
      'get-vapid-public-key',
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (vapidError || !vapidData?.vapidPublicKey) {
      console.error('[Push Notifications] VAPID key error:', vapidError);
      throw new Error('Failed to get VAPID key');
    }

    // Convertir la clé VAPID
    const applicationServerKey = urlBase64ToUint8Array(vapidData.vapidPublicKey);

    // Vérifier la souscription existante
    const existingSubscription = await swResult.registration.pushManager.getSubscription();
    if (existingSubscription) {
      await existingSubscription.unsubscribe();
      console.log('[Push Notifications] Unsubscribed from existing subscription');
    }

    // Créer une nouvelle souscription
    console.log('[Push Notifications] Creating new subscription');
    const subscription = await swResult.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    console.log('[Push Notifications] New subscription created:', subscription);

    const subscriptionJSON = subscription.toJSON();

    // Stocker la souscription dans la base de données
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
      console.error('[Push Notifications] Database error:', insertError);
      throw insertError;
    }

    console.log('[Push Notifications] Subscription stored in database');
    return true;
  } catch (error) {
    console.error('[Push Notifications] Subscription error:', {
      error,
      message: error.message,
      stack: error.stack
    });
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
