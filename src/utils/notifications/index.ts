
import { supabase } from "@/integrations/supabase/client";
import { showCustomPermissionMessage } from "./permissionHandling";
import { playNotificationSound } from "../notificationSounds";

// Utility to convert base64 to Uint8Array for VAPID key
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

export async function subscribeToNotifications() {
  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    // Check browser support
    if (!window.isSecureContext) {
      console.error('[Notifications] Not in a secure context');
      throw new Error('Notifications require a secure context (HTTPS)');
    }

    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      console.error('[Notifications] Required features not supported');
      throw new Error('Your browser does not support notifications');
    }

    // Handle permissions
    let permission = Notification.permission;
    
    if (permission === 'denied') {
      console.log('[Notifications] Permission denied');
      showCustomPermissionMessage();
      return false;
    }

    if (permission === 'default') {
      permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showCustomPermissionMessage();
        return false;
      }
    }

    // Set up service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    await navigator.serviceWorker.ready;

    try {
      // Get subscription from service worker
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Get VAPID key from Supabase
      const { data: vapidData, error: vapidError } = 
        await supabase.functions.invoke('get-vapid-public-key');

      if (vapidError || !vapidData?.publicKey) {
        throw new Error('Could not get VAPID key');
      }

      // Subscribe to push notifications
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey)
      });

      // Get device info
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenSize: `${window.screen.width}x${window.screen.height}`
      };

      // Save subscription to Supabase
      const { error: saveError } = await supabase
        .from('web_push_subscriptions')
        .upsert({
          user_id: session.user.id,
          endpoint: newSubscription.endpoint,
          p256dh_key: btoa(String.fromCharCode.apply(null, 
            new Uint8Array(newSubscription.getKey('p256dh') as ArrayBuffer))),
          auth_key: btoa(String.fromCharCode.apply(null, 
            new Uint8Array(newSubscription.getKey('auth') as ArrayBuffer))),
          user_agent: navigator.userAgent,
          status: 'active'
        });

      if (saveError) {
        console.error('[Notifications] Error saving subscription:', saveError);
        throw new Error('Failed to save subscription');
      }

      // Preload notification sounds
      await Promise.all([
        playNotificationSound('immediate', true),
        playNotificationSound('scheduled', true)
      ]);

      return true;
    } catch (error) {
      console.error('[Notifications] Error in subscription process:', error);
      throw error;
    }
  } catch (error) {
    console.error('[Notifications] Subscription error:', error);
    if (error.name === 'NotAllowedError') {
      showCustomPermissionMessage();
    }
    throw error;
  }
}

export async function unsubscribeFromNotifications() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      throw new Error('No service worker registration found');
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      throw new Error('No push subscription found');
    }

    // Update subscription status in Supabase
    const { error: updateError } = await supabase
      .from('web_push_subscriptions')
      .update({ status: 'revoked' })
      .eq('user_id', session.user.id)
      .eq('endpoint', subscription.endpoint);

    if (updateError) {
      throw new Error('Failed to update subscription status');
    }

    // Unsubscribe from push manager
    await subscription.unsubscribe();
    return true;
  } catch (error) {
    console.error('[Notifications] Unsubscribe error:', error);
    throw error;
  }
}
