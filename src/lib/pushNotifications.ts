import { supabase } from "@/integrations/supabase/client";

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('[Push Notifications] Service Worker registered:', registration)
      return registration
    } catch (error) {
      console.error('[Push Notifications] Service Worker registration failed:', error)
      throw error
    }
  }
  throw new Error('Service Worker not supported')
}

export async function subscribeToPushNotifications(interpreterId: string) {
  try {
    console.log('[Push Notifications] Starting subscription process for interpreter:', interpreterId);
    
    const registration = await registerServiceWorker()
    
    // Request notification permission
    console.log('[Push Notifications] Requesting notification permission');
    const permission = await Notification.requestPermission()
    console.log('[Push Notifications] Notification permission status:', permission);
    
    if (permission !== 'granted') {
      throw new Error('Notification permission denied')
    }

    // Get VAPID public key from Edge Function
    console.log('[Push Notifications] Fetching VAPID public key');
    const { data: { vapidPublicKey }, error: vapidError } = await supabase.functions.invoke(
      'get-vapid-public-key',
      { method: 'GET' }
    )

    if (vapidError) {
      console.error('[Push Notifications] Error fetching VAPID key:', vapidError);
      throw vapidError;
    }

    console.log('[Push Notifications] Got VAPID public key');

    // Subscribe to push notifications
    console.log('[Push Notifications] Subscribing to push notifications');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey
    })

    console.log('[Push Notifications] Push subscription created:', subscription);

    const subscriptionJSON = subscription.toJSON()

    // Store subscription in database
    console.log('[Push Notifications] Storing subscription in database');
    const { error: insertError } = await supabase
      .from('push_subscriptions')
      .upsert({
        interpreter_id: interpreterId,
        endpoint: subscriptionJSON.endpoint,
        p256dh: subscriptionJSON.keys.p256dh,
        auth: subscriptionJSON.keys.auth,
        user_agent: navigator.userAgent,
        status: 'active'
      }, {
        onConflict: 'interpreter_id,endpoint'
      })

    if (insertError) {
      console.error('[Push Notifications] Error storing subscription:', insertError);
      throw insertError;
    }

    console.log('[Push Notifications] Subscription stored successfully');
    return true
  } catch (error) {
    console.error('[Push Notifications] Error subscribing to push notifications:', error)
    throw error
  }
}

export async function unsubscribeFromPushNotifications(interpreterId: string) {
  try {
    console.log('[Push Notifications] Starting unsubscribe process for interpreter:', interpreterId);
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      console.log('[Push Notifications] Found existing subscription, unsubscribing');
      await subscription.unsubscribe()
      
      // Remove subscription from database
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('interpreter_id', interpreterId)
        .eq('endpoint', subscription.endpoint)

      if (error) {
        console.error('[Push Notifications] Error removing subscription from database:', error);
        throw error;
      }
      
      console.log('[Push Notifications] Successfully unsubscribed');
    }

    return true
  } catch (error) {
    console.error('[Push Notifications] Error unsubscribing from push notifications:', error)
    throw error
  }
}

export async function sendPushNotification(message: {
  title: string
  body: string
  icon?: string
  data?: Record<string, unknown>
  interpreterIds?: string[]
}) {
  try {
    console.log('[Push Notifications] Sending push notification:', message);
    const { error } = await supabase.functions.invoke(
      'send-push-notification',
      {
        method: 'POST',
        body: { message }
      }
    )

    if (error) {
      console.error('[Push Notifications] Error sending push notification:', error);
      throw error;
    }

    console.log('[Push Notifications] Push notification sent successfully');
    return true
  } catch (error) {
    console.error('[Push Notifications] Error sending push notification:', error)
    throw error
  }
}