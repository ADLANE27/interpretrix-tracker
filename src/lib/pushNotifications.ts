import { supabase } from "@/integrations/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  try {
    if (!base64String || typeof base64String !== 'string') {
      throw new Error('Invalid base64 input');
    }
    
    console.log('[Push Notifications] Converting base64:', base64String);
    
    const base64 = base64String
      .replace(/-/g, '+')
      .replace(/_/g, '/');
      
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const base64Padded = base64 + padding;
    
    console.log('[Push Notifications] Padded base64:', base64Padded);

    const rawData = window.atob(base64Padded);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    console.log('[Push Notifications] Successfully converted to Uint8Array');
    return outputArray;
  } catch (error) {
    console.error('[Push Notifications] Base64 conversion error:', error);
    console.error('[Push Notifications] Input string:', base64String);
    throw new Error('Failed to convert VAPID key. Please check the key format.');
  }
}

export async function subscribeToPushNotifications(interpreterId: string): Promise<boolean> {
  try {
    console.log('[Push Notifications] Starting subscription process');

    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      console.error('[Push Notifications] Browser does not support notifications');
      throw new Error('Les notifications push ne sont pas supportées par votre navigateur');
    }

    console.log('[Push Notifications] Requesting permission');
    const permission = await Notification.requestPermission();
    console.log('[Push Notifications] Permission result:', permission);
    
    if (permission !== 'granted') {
      throw new Error('Permission refusée pour les notifications');
    }

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
    
    const applicationServerKey = urlBase64ToUint8Array(vapidData.vapidPublicKey);
    console.log('[Push Notifications] Converted VAPID key to Uint8Array');

    console.log('[Push Notifications] Unregistering all service workers');
    const existingRegistrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(existingRegistrations.map(reg => reg.unregister()));

    console.log('[Push Notifications] Registering new service worker');
    const registration = await navigator.serviceWorker.register('/sw.js');
    
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

    console.log('[Push Notifications] Subscribing to push notifications');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    console.log('[Push Notifications] Push subscription:', subscription);

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
        await subscription.unsubscribe();
        
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('interpreter_id', interpreterId)
          .eq('endpoint', subscription.endpoint);

        if (error) throw error;
      }
      
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
    
    const registration = await navigator.serviceWorker.ready;
    if (!registration.pushManager) {
      throw new Error('Push manager not found');
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      throw new Error('No push subscription found');
    }

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
