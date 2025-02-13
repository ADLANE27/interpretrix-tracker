
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

    // Vérifier la permission
    if (Notification.permission === 'denied') {
      throw new Error('Notification permission denied');
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

    // 3. Nettoyer les anciens service workers
    const existingRegistrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(existingRegistrations.map(reg => reg.unregister()));

    // 4. Enregistrer le nouveau Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    // 5. Attendre que le service worker soit actif
    await registration.active || await new Promise<void>((resolve) => {
      registration.addEventListener('activate', () => resolve());
    });

    // 6. Demander la permission si nécessaire
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission not granted');
      }
    }

    // 7. Gérer la souscription
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      await existingSubscription.unsubscribe();
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    // 8. Sauvegarder la souscription
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
    console.log('[Push Notifications] Sending test notification to:', interpreterId);

    // 1. Vérifier la permission
    if (Notification.permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    // 2. Vérifier le service worker
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.active) {
      throw new Error('Service worker not active');
    }

    // 3. Vérifier la souscription
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    // 4. Envoyer la notification
    const { data, error } = await supabase.functions.invoke(
      'send-push-notification',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      console.error('[Push Notifications] Edge function error:', error);
      throw error;
    }

    if (!data?.success) {
      console.error('[Push Notifications] Push notification failed:', data);
      throw new Error(data?.message || 'Failed to send notification');
    }

    console.log('[Push Notifications] Test notification sent successfully:', data);
  } catch (error) {
    console.error('[Push Notifications] Test notification error:', error);
    throw error;
  }
}
