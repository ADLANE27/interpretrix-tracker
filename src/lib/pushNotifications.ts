
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

    // Unregister any existing service workers
    const existingRegistrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(existingRegistrations.map(reg => reg.unregister()));

    // Register new service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      type: 'module',
      updateViaCache: 'none'
    });

    console.log('[Push Notifications] Service Worker registered:', {
      scope: registration.scope,
      state: registration.active?.state
    });

    // Wait for the service worker to be ready
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

    // Request notification permission first
    const permissionResult = await Notification.requestPermission();
    if (permissionResult !== 'granted') {
      throw new Error(`Permission not granted: ${permissionResult}`);
    }

    // Register service worker
    const swResult = await registerServiceWorker();
    if (!swResult.success || !swResult.registration) {
      throw new Error('Failed to register service worker');
    }

    // Get VAPID public key
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

    // Convert VAPID key
    const applicationServerKey = urlBase64ToUint8Array(vapidData.vapidPublicKey);

    // Check for existing subscription
    const existingSubscription = await swResult.registration.pushManager.getSubscription();
    if (existingSubscription) {
      await existingSubscription.unsubscribe();
    }

    // Create new subscription
    const subscription = await swResult.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    const subscriptionJSON = subscription.toJSON();

    // Store subscription in database
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
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();

      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('interpreter_id', interpreterId)
        .eq('endpoint', subscription.endpoint);

      if (error) throw error;
    }

    await registration.unregister();
    return true;
  } catch (error) {
    console.error('[Push Notifications] Unsubscribe error:', error);
    throw error;
  }
}

export async function sendTestNotification(interpreterId: string) {
  try {
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

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[Push Notifications] Test notification error:', error);
    throw error;
  }
}
