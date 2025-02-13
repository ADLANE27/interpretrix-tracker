
import { supabase } from "@/integrations/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  try {
    // S'assurer que la chaîne est propre avant le traitement
    const cleanBase64 = base64String
      .trim()
      .replace(/[^A-Za-z0-9+/]/g, '') // Ne garder que les caractères valides base64
    
    const padding = '='.repeat((4 - cleanBase64.length % 4) % 4);
    const base64 = (cleanBase64 + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    console.log('[Push Notifications] Processed base64:', base64);

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (error) {
    console.error('[Push Notifications] Error converting base64 to Uint8Array:', error);
    throw new Error('Format de clé VAPID invalide. Contactez le support.');
  }
}

export async function subscribeToPushNotifications(interpreterId: string): Promise<boolean> {
  try {
    console.log('[Push Notifications] Starting subscription process');

    // 1. Check browser support
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      console.error('[Push Notifications] Browser does not support notifications');
      throw new Error('Les notifications push ne sont pas supportées par votre navigateur');
    }

    // 2. Request permission first
    console.log('[Push Notifications] Requesting permission');
    const permission = await Notification.requestPermission();
    console.log('[Push Notifications] Permission result:', permission);
    
    if (permission !== 'granted') {
      throw new Error('Permission refusée pour les notifications');
    }

    // 3. Get VAPID key
    console.log('[Push Notifications] Fetching VAPID key');
    const { data: vapidData, error: vapidError } = await supabase.functions.invoke(
      'get-vapid-public-key',
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (vapidError) {
      console.error('[Push Notifications] VAPID key error:', vapidError);
      throw vapidError;
    }

    if (!vapidData?.vapidPublicKey) {
      console.error('[Push Notifications] No VAPID key in response:', vapidData);
      throw new Error('Clé VAPID non reçue');
    }

    console.log('[Push Notifications] Got VAPID key:', vapidData.vapidPublicKey);
    
    // Convertir la clé VAPID une seule fois
    const applicationServerKey = urlBase64ToUint8Array(vapidData.vapidPublicKey);
    console.log('[Push Notifications] Converted VAPID key to Uint8Array');

    // 4. Unregister ALL existing service workers
    console.log('[Push Notifications] Unregistering all service workers');
    const existingRegistrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(existingRegistrations.map(reg => reg.unregister()));

    // 5. Register new service worker
    console.log('[Push Notifications] Registering new service worker');
    const registration = await navigator.serviceWorker.register('/sw.js');
    
    // 6. Wait for the service worker to be ready
    if (registration.installing || registration.waiting) {
      console.log('[Push Notifications] Waiting for service worker to be ready');
      await new Promise<void>((resolve) => {
        const serviceWorker = registration.installing || registration.waiting;
        if (!serviceWorker) {
          resolve();
          return;
        }
        
        serviceWorker.addEventListener('statechange', () => {
          if (serviceWorker.state === 'activated') {
            console.log('[Push Notifications] Service worker activated');
            resolve();
          }
        });
      });
    }

    // 7. Subscribe to push
    console.log('[Push Notifications] Subscribing to push notifications');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    console.log('[Push Notifications] Push subscription:', subscription);

    // 8. Save subscription
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
      console.error('[Push Notifications] Error saving subscription:', insertError);
      throw insertError;
    }

    console.log('[Push Notifications] Subscription saved successfully');
    return true;

  } catch (error) {
    console.error('[Push Notifications] Subscription error:', error);
    throw error;
  }
}

export async function unsubscribeFromPushNotifications(interpreterId: string): Promise<boolean> {
  try {
    console.log('[Push Notifications] Starting unsubscribe process');
    
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    for (const registration of registrations) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // 1. Unsubscribe from push
        await subscription.unsubscribe();
        
        // 2. Delete from database
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('interpreter_id', interpreterId)
          .eq('endpoint', subscription.endpoint);

        if (error) throw error;
      }
      
      // 3. Unregister service worker
      await registration.unregister();
    }

    return true;
  } catch (error) {
    console.error('[Push Notifications] Unsubscribe error:', error);
    throw error;
  }
}

export async function sendTestNotification(interpreterId: string): Promise<void> {
  try {
    console.log('[Push Notifications] Sending test notification');
    
    // 1. Verify service worker registration
    const registration = await navigator.serviceWorker.ready;
    if (!registration.pushManager) {
      throw new Error('Push manager not found');
    }

    // 2. Verify subscription
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      throw new Error('No push subscription found');
    }

    // 3. Send test notification
    const { error } = await supabase.functions.invoke(
      'send-push-notification',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: {
            interpreterIds: [interpreterId],
            title: 'Test de notification',
            body: 'Cette notification est un test pour vérifier que tout fonctionne correctement.',
            data: {
              type: 'test'
            }
          }
        }
      }
    );

    if (error) throw error;

  } catch (error) {
    console.error('[Push Notifications] Test notification error:', error);
    throw error;
  }
}
