
import { supabase } from "@/integrations/supabase/client";
import { showCustomPermissionMessage } from "./permissionHandling";

export async function subscribeToNotifications() {
  try {
    // Vérifier la session d'abord
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    // Check if we're in a secure context
    if (!window.isSecureContext) {
      console.error('[Notifications] Not in a secure context');
      throw new Error('Notifications require a secure context (HTTPS)');
    }

    // Check service worker support
    if (!('serviceWorker' in navigator)) {
      console.error('[Notifications] Service Workers not supported');
      throw new Error('Your browser does not support service workers');
    }

    // Check notification support
    if (!('Notification' in window)) {
      console.error('[Notifications] Notifications not supported');
      throw new Error('Your browser does not support notifications');
    }

    // Check notification permission
    let permission = Notification.permission;
    
    if (permission === 'denied') {
      console.log('[Notifications] Permission previously denied, showing custom message');
      showCustomPermissionMessage();
      return false;
    }

    if (permission === 'default') {
      console.log('[Notifications] Requesting permission');
      permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.log('[Notifications] Permission not granted');
        showCustomPermissionMessage();
        return false;
      }
    }

    // Register service worker
    console.log('[Notifications] Registering service worker');
    let registration;
    try {
      registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('[Notifications] Service Worker registered:', registration);
    } catch (error) {
      console.error('[Notifications] Service Worker registration failed:', error);
      throw new Error('Failed to register service worker');
    }

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    console.log('[Notifications] Service Worker ready');

    // Get VAPID key with session token
    const { data: vapidData, error: vapidError } = await supabase.functions.invoke('get-vapid-public-key', {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });
    
    if (vapidError || !vapidData?.vapidPublicKey) {
      console.error('[Notifications] VAPID key error:', vapidError);
      throw new Error('Could not get VAPID key');
    }

    // Subscribe to push
    console.log('[Notifications] Subscribing to push notifications');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidData.vapidPublicKey
    });

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
      console.error('[Notifications] Subscription save error:', subError);
      throw subError;
    }

    console.log('[Notifications] Successfully subscribed to notifications');
    return true;

  } catch (error: any) {
    console.error('[Notifications] Error subscribing to notifications:', error);
    if (error.name === 'NotAllowedError') {
      showCustomPermissionMessage();
    }
    throw error;
  }
}

export async function unsubscribeFromNotifications() {
  try {
    // Vérifier la session d'abord
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    console.log('[Notifications] Unsubscribing from notifications');
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.error('[Notifications] No service worker registration found');
      throw new Error('No service worker registration found');
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.error('[Notifications] No push subscription found');
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
      console.error('[Notifications] Error updating subscription:', updateError);
      throw updateError;
    }

    // Unsubscribe from push manager
    await subscription.unsubscribe();
    console.log('[Notifications] Successfully unsubscribed from notifications');

    return true;
  } catch (error) {
    console.error('[Notifications] Error unsubscribing from notifications:', error);
    throw error;
  }
}
