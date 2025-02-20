
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

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

export const confirmNotificationDelivery = async (notificationId: string) => {
  try {
    const { error } = await supabase
      .from('notification_queue')
      .update({
        status: 'delivered',
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('[pushNotifications] Confirmation error:', error);
    return { success: false, error };
  }
};

export const registerPushNotifications = async () => {
  try {
    console.log('[pushNotifications] Starting registration process');

    // 1. Check browser support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Les notifications push ne sont pas prises en charge par votre navigateur');
    }

    // 2. Request notification permission if not granted
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permission refusée pour les notifications');
      }
    }

    // 3. Check authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error('Utilisateur non authentifié');
    }

    // 4. Register service worker if not already registered
    console.log('[pushNotifications] Registering service worker');
    let registration = await navigator.serviceWorker.getRegistration();
    
    if (!registration) {
      registration = await navigator.serviceWorker.register('/service-worker.js');
      await registration.update();
    }

    // 5. Check existing subscription
    console.log('[pushNotifications] Checking existing subscription');
    const existingSubscription = await registration.pushManager.getSubscription();
    
    // Only unsubscribe if the subscription is invalid
    if (existingSubscription) {
      try {
        await existingSubscription.getKey('p256dh');
        // If the subscription is valid, return it
        console.log('[pushNotifications] Using existing valid subscription');
        return {
          success: true,
          message: 'Notifications push déjà activées'
        };
      } catch (error) {
        console.log('[pushNotifications] Found invalid subscription, removing it');
        await existingSubscription.unsubscribe();
        await supabase
          .from('user_push_subscriptions')
          .delete()
          .eq('user_id', session.user.id);
      }
    }

    // 6. Get VAPID public key
    console.log('[pushNotifications] Getting VAPID public key');
    const { data: vapidData, error: vapidError } = await supabase.functions.invoke('get-vapid-keys');
    if (vapidError || !vapidData?.publicKey) {
      console.error('[pushNotifications] VAPID key error:', vapidError);
      throw new Error('Impossible de récupérer la clé publique VAPID');
    }

    // 7. Create new subscription
    console.log('[pushNotifications] Creating new push subscription');
    const pushSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey)
    });

    // 8. Save subscription to database
    console.log('[pushNotifications] Saving subscription to database');
    const subscriptionJson = pushSubscription.toJSON();
    const subscriptionData = {
      endpoint: subscriptionJson.endpoint,
      keys: subscriptionJson.keys,
      expirationTime: subscriptionJson.expirationTime
    } as Json;

    const { error: upsertError } = await supabase
      .from('user_push_subscriptions')
      .upsert({
        user_id: session.user.id,
        subscription: subscriptionData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (upsertError) {
      throw upsertError;
    }

    return {
      success: true,
      message: 'Notifications push activées avec succès'
    };

  } catch (error) {
    console.error('[pushNotifications] Registration error:', error);
    // Cleanup on error
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
    } catch (cleanupError) {
      console.error('[pushNotifications] Cleanup error:', cleanupError);
    }
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Impossible d\'activer les notifications push'
    };
  }
};

export const checkPushNotificationStatus = async () => {
  try {
    console.log('[pushNotifications] Checking status...');
    
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('[pushNotifications] Notifications not supported');
      return { enabled: false, permission: 'unsupported' };
    }

    // Get current permission status
    const permission = Notification.permission;
    console.log('[pushNotifications] Current permission:', permission);

    // Check if service worker is registered
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    console.log('[pushNotifications] Current subscription:', subscription);

    // Check if subscription is still valid
    if (subscription) {
      try {
        // Test if the subscription is still valid
        await subscription.getKey('p256dh');
      } catch (error) {
        console.log('[pushNotifications] Invalid subscription, removing it');
        await subscription.unsubscribe();
        return { enabled: false, permission, subscription: null };
      }
    }

    return {
      enabled: permission === 'granted' && !!subscription,
      permission,
      subscription
    };
  } catch (error) {
    console.error('[pushNotifications] Status check error:', error);
    return {
      enabled: false,
      permission: Notification.permission,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
};

export const unregisterPushNotifications = async () => {
  try {
    console.log('[pushNotifications] Starting unregistration process');
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Remove subscription from database first
    console.log('[pushNotifications] Removing subscription from database');
    const { error: deleteError } = await supabase
      .from('user_push_subscriptions')
      .delete()
      .eq('user_id', session.user.id);

    if (deleteError) {
      throw deleteError;
    }

    // Then unsubscribe from push manager
    console.log('[pushNotifications] Unsubscribing from push manager');
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('[pushNotifications] Successfully unsubscribed');
    }

    return {
      success: true,
      message: 'Notifications push désactivées avec succès'
    };

  } catch (error) {
    console.error('[pushNotifications] Unregister error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Impossible de désactiver les notifications push'
    };
  }
};
