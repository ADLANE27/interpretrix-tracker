
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

// Convert a base64 string to a Uint8Array for the applicationServerKey
function urlBase64ToUint8Array(base64String: string) {
  // First, decode the base64url format to regular base64
  const base64Url = base64String.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64Url.length % 4) % 4);
  const base64 = base64Url + padding;
  
  // Then convert to binary string
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  // Convert to Uint8Array
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

    // Check if page is visible
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

    console.log('[Push Notifications] Creating subscription with VAPID key:', vapidData.vapidPublicKey);
    const applicationServerKey = urlBase64ToUint8Array(vapidData.vapidPublicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });

    console.log('[Push Notifications] Subscription created:', subscription);

    const subscriptionJSON = subscription.toJSON();
    const { error: saveError } = await supabase
      .from('push_subscriptions')
      .upsert({
        interpreter_id: interpreterId,
        endpoint: subscription.endpoint,
        p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')!))),
        auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')!))),
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
    console.log('[Push Notifications] Unsubscribing for interpreter:', interpreterId);
    
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.log('[Push Notifications] No service worker registration found');
      return true;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      console.log('[Push Notifications] Found subscription, unsubscribing');
      await subscription.unsubscribe();
      
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('interpreter_id', interpreterId)
        .eq('endpoint', subscription.endpoint);
    }

    await registration.unregister();
    console.log('[Push Notifications] Successfully unsubscribed');
    return true;
  } catch (error) {
    console.error('[Push Notifications] Error unsubscribing:', error);
    throw error;
  }
}

export async function sendTestNotification(interpreterId: string): Promise<void> {
  try {
    console.log('[Push Notifications] Sending test notification to interpreter:', interpreterId);
    
    // Vérification des paramètres
    if (!interpreterId) {
      throw new Error('Interpreter ID is required');
    }

    console.log('[Push Notifications] Invoking send-test-notification function');
    
    const { data, error } = await supabase.functions.invoke(
      'send-test-notification',
      {
        method: 'POST',
        body: JSON.stringify({ interpreterId }),
        headers: {
          'Content-Type': 'application/json',
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
