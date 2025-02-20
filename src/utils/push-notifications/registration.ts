
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { urlBase64ToUint8Array } from "./utils";

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

    // 8. Save subscription to database with simplified data structure
    console.log('[pushNotifications] Saving subscription to database');
    const subscriptionJson = pushSubscription.toJSON();
    const subscriptionData = {
      endpoint: subscriptionJson.endpoint,
      keys: subscriptionJson.keys,
      expirationTime: subscriptionJson.expirationTime
    } as Json;

    // Remove updated_at from the insert since it's handled by the database
    const { error: upsertError } = await supabase
      .from('user_push_subscriptions')
      .upsert({
        user_id: session.user.id,
        subscription: subscriptionData
      });

    if (upsertError) {
      console.error('[pushNotifications] Database error:', upsertError);
      throw new Error('Erreur lors de l\'enregistrement des notifications');
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
