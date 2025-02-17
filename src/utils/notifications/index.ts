
import { supabase } from "@/integrations/supabase/client";
import { showCustomPermissionMessage } from "./permissionHandling";
import { playNotificationSound } from "../notificationSounds";

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

    // Get VAPID key
    const { data: vapidData, error: vapidError } = await supabase.functions.invoke('get-vapid-public-key');
    
    if (vapidError || !vapidData?.vapidPublicKey) {
      throw new Error('Could not get VAPID key');
    }

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidData.vapidPublicKey
    });

    // Save subscription
    const { error: subError } = await supabase.from('web_push_subscriptions').upsert({
      user_id: session.user.id,
      endpoint: subscription.endpoint,
      p256dh_key: Buffer.from(subscription.getKey('p256dh') as ArrayBuffer).toString('base64'),
      auth_key: Buffer.from(subscription.getKey('auth') as ArrayBuffer).toString('base64'),
      user_agent: navigator.userAgent,
      status: 'active'
    }, {
      onConflict: 'endpoint'
    });

    if (subError) {
      throw subError;
    }

    // Preload notification sounds
    await Promise.all([
      playNotificationSound('immediate', true),
      playNotificationSound('scheduled', true)
    ]);

    return true;
  } catch (error: any) {
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

    // Update subscription status
    const { error: updateError } = await supabase.from('web_push_subscriptions')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', session.user.id)
      .eq('endpoint', subscription.endpoint);

    if (updateError) {
      throw updateError;
    }

    // Unsubscribe from push manager
    await subscription.unsubscribe();
    return true;
  } catch (error) {
    console.error('[Notifications] Unsubscribe error:', error);
    throw error;
  }
}
