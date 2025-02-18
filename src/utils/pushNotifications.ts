
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

// Convert base64 string to Uint8Array for applicationServerKey
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

export const registerPushNotifications = async () => {
  try {
    console.log('[pushNotifications] Starting registration process');

    // 1. Check browser support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications are not supported');
    }

    // 2. Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permission denied for notifications');
    }

    // 3. Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error('User not authenticated');
    }

    // 4. Register service worker
    console.log('[pushNotifications] Registering service worker');
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });
    console.log('[pushNotifications] Service Worker registered');

    // 5. Get VAPID public key
    const { data: vapidData, error: vapidError } = await supabase.functions.invoke('get-vapid-keys');
    if (vapidError || !vapidData?.publicKey) {
      throw new Error('Failed to get VAPID public key');
    }

    // 6. Subscribe to push notifications
    console.log('[pushNotifications] Subscribing to push notifications');
    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey)
    };

    const pushSubscription = await registration.pushManager.subscribe(subscribeOptions);
    console.log('[pushNotifications] Push subscription created:', pushSubscription);

    // 7. Convert PushSubscription to a plain object that matches our Json type
    const subscriptionJson = pushSubscription.toJSON();
    const subscriptionData = {
      endpoint: subscriptionJson.endpoint,
      keys: subscriptionJson.keys,
      expirationTime: subscriptionJson.expirationTime
    } as Json;

    // 8. Save subscription to Supabase
    const { error: upsertError } = await supabase
      .from('user_push_subscriptions')
      .upsert({
        user_id: session.user.id,
        subscription: subscriptionData
      });

    if (upsertError) {
      throw upsertError;
    }

    return {
      success: true,
      message: 'Push notifications enabled successfully'
    };

  } catch (error) {
    console.error('[pushNotifications] Registration error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to enable push notifications'
    };
  }
};

export const checkPushNotificationStatus = async () => {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      return { enabled: false, permission: 'unsupported' };
    }

    // Get current permission status
    const permission = Notification.permission;

    // Check if service worker is registered
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

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
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
