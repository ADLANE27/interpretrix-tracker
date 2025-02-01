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

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker not supported');
  }

  try {
    // Unregister any existing service workers first
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }

    // Register new service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('[Push Notifications] Service Worker registered:', registration);
    
    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    console.log('[Push Notifications] Service Worker ready');
    
    return registration;
  } catch (error) {
    console.error('[Push Notifications] Service Worker registration failed:', error);
    throw error;
  }
}

export async function subscribeToPushNotifications(interpreterId: string) {
  try {
    console.log('[Push Notifications] Starting subscription process');
    
    const registration = await registerServiceWorker();
    
    // Request notification permission
    const permission = await Notification.requestPermission();
    console.log('[Push Notifications] Permission status:', permission);
    
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    // Get VAPID public key
    const { data: { vapidPublicKey }, error: vapidError } = await supabase.functions.invoke(
      'get-vapid-public-key',
      { method: 'GET' }
    );

    if (vapidError) {
      console.error('[Push Notifications] Error fetching VAPID key:', vapidError);
      throw vapidError;
    }

    // Convert VAPID key
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    // Check for existing subscription
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      await existingSubscription.unsubscribe();
    }

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    console.log('[Push Notifications] Push subscription created');

    const subscriptionJSON = subscription.toJSON();

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
      });

    if (insertError) {
      console.error('[Push Notifications] Error storing subscription:', insertError);
      throw insertError;
    }

    console.log('[Push Notifications] Subscription stored successfully');
    return true;
  } catch (error) {
    console.error('[Push Notifications] Error in subscription process:', error);
    throw error;
  }
}

export async function unsubscribeFromPushNotifications(interpreterId: string) {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      
      // Remove from database
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('interpreter_id', interpreterId)
        .eq('endpoint', subscription.endpoint);
    }

    return true;
  } catch (error) {
    console.error('[Push Notifications] Error unsubscribing:', error);
    throw error;
  }
}