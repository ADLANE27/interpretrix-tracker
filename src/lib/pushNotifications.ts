
import { supabase } from "@/integrations/supabase/client";

async function registerServiceWorker() {
  console.log('[SW] Registering service worker');
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  return registration;
}

// Convert a base64 string to a Uint8Array for the applicationServerKey
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
    // Basic feature detection
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      throw new Error('Les notifications ne sont pas supportées par votre navigateur');
    }

    // Check permission
    if (Notification.permission === 'denied') {
      throw new Error('Les notifications sont bloquées dans votre navigateur');
    }

    // Register service worker
    const registration = await registerServiceWorker();
    
    // Check existing subscription
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      const { data: dbSub } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('interpreter_id', interpreterId)
        .eq('endpoint', existingSubscription.endpoint)
        .eq('status', 'active')
        .single();

      if (dbSub) {
        return true;
      }

      await existingSubscription.unsubscribe();
    }

    // Request permission if needed
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permission refusée pour les notifications');
      }
    }

    // Get VAPID key
    const { data: vapidData, error: vapidError } = await supabase.functions.invoke(
      'get-vapid-public-key',
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (vapidError || !vapidData?.vapidPublicKey) {
      console.error('[Push Notifications] VAPID key error:', vapidError);
      throw new Error('Erreur lors de la récupération de la clé VAPID');
    }

    console.log('[Push Notifications] Got VAPID key:', vapidData.vapidPublicKey);

    // Convert the base64 VAPID key to Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(vapidData.vapidPublicKey);

    // Create subscription with converted key
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });

    console.log('[Push Notifications] Created subscription:', subscription);

    // Save subscription
    const { error: saveError } = await supabase
      .from('push_subscriptions')
      .upsert({
        interpreter_id: interpreterId,
        endpoint: subscription.endpoint,
        p256dh: subscription.toJSON().keys.p256dh,
        auth: subscription.toJSON().keys.auth,
        user_agent: navigator.userAgent,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (saveError) {
      console.error('[Push Notifications] Save error:', saveError);
      throw new Error('Erreur lors de l\'enregistrement de la souscription');
    }

    return true;
  } catch (error) {
    console.error('[Push Notifications] Error:', error);
    throw error;
  }
}

export async function unsubscribeFromPushNotifications(interpreterId: string): Promise<boolean> {
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return true;

  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('interpreter_id', interpreterId)
      .eq('endpoint', subscription.endpoint);
  }

  await registration.unregister();
  return true;
}

export async function sendTestNotification(interpreterId: string): Promise<void> {
  try {
    console.log('[Push Notifications] Sending test notification to interpreter:', interpreterId);
    
    const { data, error } = await supabase.functions.invoke(
      'send-push-notification',
      {
        method: 'POST',
        body: {
          message: {
            interpreterIds: [interpreterId],
            title: 'Test de notification',
            body: 'Cette notification est un test',
            data: { type: 'test' }
          }
        }
      }
    );

    if (error) {
      console.error('[Push Notifications] Error sending test notification:', error);
      throw error;
    }

    console.log('[Push Notifications] Test notification sent successfully:', data);
  } catch (error) {
    console.error('[Push Notifications] Error in sendTestNotification:', error);
    throw error;
  }
}
