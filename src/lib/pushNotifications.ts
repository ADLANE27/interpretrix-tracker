
import { supabase } from "@/integrations/supabase/client";

async function registerServiceWorker() {
  try {
    console.log('[SW] Registering service worker');
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error('[SW] Error registering service worker:', error);
    throw error;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const base64Url = base64String.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64Url.length % 4) % 4);
  const base64 = base64Url + padding;
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPushNotifications(interpreterId: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      throw new Error('Les notifications ne sont pas supportées par votre navigateur');
    }

    if (Notification.permission === 'denied') {
      throw new Error('Les notifications sont bloquées dans votre navigateur');
    }

    if (document.visibilityState !== 'visible') {
      throw new Error('La page doit être visible pour activer les notifications');
    }

    const registration = await registerServiceWorker();
    
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
        console.log('[Push Notifications] Existing subscription found:', dbSub);
        return true;
      }

      console.log('[Push Notifications] Unsubscribing from existing subscription');
      await existingSubscription.unsubscribe();
    }

    if (Notification.permission === 'default') {
      console.log('[Push Notifications] Requesting permission');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permission refusée pour les notifications');
      }
    }

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

    const applicationServerKey = urlBase64ToUint8Array(vapidData.vapidPublicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });

    const keys = subscription.getKey('p256dh') && subscription.getKey('auth') ? {
      p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')!))),
      auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')!)))
    } : null;

    if (!keys) {
      throw new Error('Failed to get subscription keys');
    }

    const { error: saveError } = await supabase
      .from('push_subscriptions')
      .upsert({
        interpreter_id: interpreterId,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: navigator.userAgent,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (saveError) {
      console.error('[Push Notifications] Save error:', saveError);
      throw new Error('Erreur lors de l\'enregistrement de la souscription');
    }

    console.log('[Push Notifications] Testing subscription...');
    await sendTestNotification(interpreterId);

    return true;
  } catch (error) {
    console.error('[Push Notifications] Error:', error);
    throw error;
  }
}

export async function unsubscribeFromPushNotifications(interpreterId: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return true;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      
      await supabase
        .from('push_subscriptions')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('interpreter_id', interpreterId)
        .eq('endpoint', subscription.endpoint);
    }

    return true;
  } catch (error) {
    console.error('[Push Notifications] Error unsubscribing:', error);
    throw error;
  }
}

export async function sendTestNotification(interpreterId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke(
      'send-test-notification',
      {
        method: 'POST',
        body: { interpreterId },
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (error) throw error;
  } catch (error) {
    console.error('[Push Notifications] Error sending test notification:', error);
    throw error;
  }
}
