import { supabase } from "@/integrations/supabase/client";

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered:', registration)
      return registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      throw error
    }
  }
  throw new Error('Service Worker not supported')
}

export async function subscribeToPushNotifications(interpreterId: string) {
  try {
    const registration = await registerServiceWorker()
    
    // Request notification permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      throw new Error('Notification permission denied')
    }

    // Get VAPID public key from Edge Function
    const { data: { vapidPublicKey }, error: vapidError } = await supabase.functions.invoke(
      'get-vapid-public-key',
      { method: 'GET' }
    )

    if (vapidError) throw vapidError

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey
    })

    const subscriptionJSON = subscription.toJSON()

    // Store subscription in database
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

    if (insertError) throw insertError

    return true
  } catch (error) {
    console.error('Error subscribing to push notifications:', error)
    throw error
  }
}

export async function unsubscribeFromPushNotifications(interpreterId: string) {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      await subscription.unsubscribe()
      
      // Remove subscription from database
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('interpreter_id', interpreterId)
        .eq('endpoint', subscription.endpoint)

      if (error) throw error
    }

    return true
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error)
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
    const { error } = await supabase.functions.invoke(
      'send-push-notification',
      {
        method: 'POST',
        body: { message }
      }
    )

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error sending push notification:', error)
    throw error
  }
}