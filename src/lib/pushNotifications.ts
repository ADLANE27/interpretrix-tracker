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

    console.log('[Push Notifications] Current notification permission:', Notification.permission);

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

    console.log('[Push Notifications] Got VAPID key');
    const applicationServerKey = urlBase64ToUint8Array(vapidData.vapidPublicKey);

    // 3. Nettoyer les anciens service workers UNIQUEMENT s'ils ne sont pas actifs
    console.log('[Push Notifications] Checking existing service workers');
    const existingRegistrations = await navigator.serviceWorker.getRegistrations();
    
    // Vérifier si nous avons déjà une souscription active
    let hasActiveSubscription = false;
    for (const reg of existingRegistrations) {
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        hasActiveSubscription = true;
        console.log('[Push Notifications] Found active subscription');
        break;
      }
    }

    // Ne nettoyer que si nous n'avons pas de souscription active
    if (!hasActiveSubscription) {
      console.log('[Push Notifications] No active subscription found, cleaning up old service workers');
      await Promise.all(existingRegistrations.map(reg => reg.unregister()));
    }

    // 4. Enregistrer le Service Worker si nécessaire
    let registration;
    try {
      console.log('[Push Notifications] Registering service worker');
      registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('[Push Notifications] Service worker registered successfully');
    } catch (error) {
      console.error('[Push Notifications] Service worker registration failed:', error);
      throw new Error('Failed to register service worker');
    }

    // 5. Demander la permission si nécessaire
    if (Notification.permission === 'default') {
      console.log('[Push Notifications] Requesting permission');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission not granted');
      }
    }

    // 6. Attendre l'activation du service worker
    if (registration.installing || registration.waiting) {
      console.log('[Push Notifications] Waiting for service worker activation');
      await new Promise<void>((resolve) => {
        registration.addEventListener('activate', () => {
          console.log('[Push Notifications] Service worker activated');
          resolve();
        });
      });
    }

    // 7. Gérer la souscription
    console.log('[Push Notifications] Managing subscription');
    const existingSubscription = await registration.pushManager.getSubscription();
    
    let subscription;
    if (existingSubscription) {
      console.log('[Push Notifications] Using existing subscription');
      subscription = existingSubscription;
    } else {
      console.log('[Push Notifications] Creating new subscription');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
    }

    // 8. Sauvegarder la souscription
    console.log('[Push Notifications] Saving subscription to database');
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

    console.log('[Push Notifications] Subscription process completed successfully');
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
        console.log('[Push Notifications] Found subscription to remove');
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

    console.log('[Push Notifications] Unsubscribe process completed');
    return true;
  } catch (error) {
    console.error('[Push Notifications] Unsubscribe error:', error);
    throw error;
  }
}

export async function sendTestNotification(interpreterId: string): Promise<void> {
  try {
    console.log('[Push Notifications] Starting test notification process');
    console.log('[Push Notifications] Current notification permission:', Notification.permission);

    // 1. Vérifier la permission
    if (Notification.permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    // 2. Vérifier le service worker
    console.log('[Push Notifications] Getting service worker registration');
    const swRegistrations = await navigator.serviceWorker.getRegistrations();
    console.log('[Push Notifications] Found service worker registrations:', swRegistrations.length);

    if (swRegistrations.length === 0) {
      throw new Error('No service worker registrations found');
    }

    const registration = swRegistrations[0];
    if (!registration.active) {
      throw new Error('Service worker not active');
    }

    // 3. Vérifier la souscription
    console.log('[Push Notifications] Checking push subscription');
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.log('[Push Notifications] No subscription found, attempting to resubscribe');
      await subscribeToPushNotifications(interpreterId);
      throw new Error('Subscription was missing, please try again after resubscribing');
    }

    // 4. Envoyer la notification
    console.log('[Push Notifications] Sending test notification');
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
