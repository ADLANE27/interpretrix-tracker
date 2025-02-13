
import { supabase } from "@/integrations/supabase/client";

async function registerServiceWorker() {
  console.log('[SW] Registering service worker');
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  return registration;
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
      throw new Error('Erreur lors de la récupération de la clé VAPID');
    }

    // Create subscription
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidData.vapidPublicKey
    });

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
  await supabase.functions.invoke(
    'send-push-notification',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
}
