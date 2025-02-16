
import { supabase } from "@/integrations/supabase/client";
import { showCustomPermissionMessage } from "./permissionHandling";

export async function sendNotification(userId: string, title: string, body: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Enregistrer dans l'historique des notifications
    const { error: historyError } = await supabase.from('notification_history').insert({
      recipient_id: userId,
      notification_type: 'mission',
      content: {
        title,
        body,
        sender_id: user.id
      }
    });

    if (historyError) {
      console.error('Error saving to notification history:', historyError);
      return false;
    }

    // Envoyer la notification push via l'edge function
    const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
      body: {
        interpreterIds: [userId],
        title,
        body,
        data: {
          timestamp: new Date().toISOString(),
          sender_id: user.id
        }
      }
    });

    if (pushError) {
      console.error('Error sending push notification:', pushError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}

export async function subscribeToNotifications() {
  try {
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

    // Get VAPID key
    const { data: vapidData, error: vapidError } = await supabase.functions.invoke('get-vapid-public-key');
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

    // Save subscription
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[Notifications] No authenticated user');
      throw new Error('User not authenticated');
    }

    const { error: subError } = await supabase.from('push_subscriptions').upsert({
      interpreter_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: Buffer.from(subscription.getKey('p256dh') as ArrayBuffer).toString('base64'),
      auth: Buffer.from(subscription.getKey('auth') as ArrayBuffer).toString('base64'),
      user_agent: navigator.userAgent,
      status: 'active'
    }, {
      onConflict: 'interpreter_id,endpoint'
    });

    if (subError) {
      console.error('[Notifications] Subscription save error:', subError);
      throw subError;
    }

    console.log('[Notifications] Successfully subscribed to notifications');
    return true;
  } catch (error: any) {
    console.error('[Notifications] Subscription error:', error);
    if (error.name === 'NotAllowedError') {
      showCustomPermissionMessage();
    }
    return false;
  }
}

export async function unsubscribeFromNotifications() {
  try {
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

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[Notifications] No authenticated user');
      throw new Error('User not authenticated');
    }

    // Update subscription status
    const { error: updateError } = await supabase.from('push_subscriptions')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('interpreter_id', user.id)
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
    console.error('[Notifications] Unsubscribe error:', error);
    return false;
  }
}
