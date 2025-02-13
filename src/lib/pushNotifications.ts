
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

export async function subscribeToPushNotifications(interpreterId: string): Promise<boolean> {
  try {
    console.log('[Push Notifications] Starting subscription process');

    // 1. Vérifier si les API nécessaires sont disponibles
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      throw new Error('Push notifications not supported');
    }

    // 2. Obtenir la clé VAPID
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

    // 3. Enregistrer le Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // 4. Gérer la souscription
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      await existingSubscription.unsubscribe();
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    // 5. Sauvegarder la souscription
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

    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));

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

    if (error) {
      console.error('[Push Notifications] Test notification edge function error:', error);
      throw error;
    }

    if (!data.success) {
      console.error('[Push Notifications] Test notification failed:', data);
      throw new Error('Failed to send test notification');
    }

    console.log('[Push Notifications] Test notification results:', data.results);
    return data;
  } catch (error) {
    console.error('[Push Notifications] Test notification error:', error);
    throw error;
  }
}
