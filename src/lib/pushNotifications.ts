
import { supabase } from "@/integrations/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  console.log('[Push Notifications] Converting VAPID key to Uint8Array');
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
    console.error('[Push Notifications] Service Worker not supported in this browser');
    throw new Error('Service Worker not supported');
  }

  try {
    console.log('[Push Notifications] Starting service worker registration');

    // Vérifier si un service worker est déjà enregistré
    const existingRegistration = await navigator.serviceWorker.getRegistration('/');
    if (existingRegistration?.active) {
      console.log('[Push Notifications] Found existing active service worker');
      return existingRegistration;
    }

    // Register service worker with explicit scope '/'
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      type: 'module',
      updateViaCache: 'none'
    });
    
    console.log('[Push Notifications] Service Worker registered:', registration);
    console.log('[Push Notifications] Service Worker scope:', registration.scope);
    
    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    console.log('[Push Notifications] Service Worker is ready');
    
    return registration;
  } catch (error) {
    console.error('[Push Notifications] Service Worker registration failed:', error);
    console.error('[Push Notifications] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
}

export async function subscribeToPushNotifications(interpreterId: string) {
  try {
    console.log('[Push Notifications] Starting subscription process for interpreter:', interpreterId);
    
    const registration = await registerServiceWorker();
    
    // Vérifier d'abord si une souscription existe déjà
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      console.log('[Push Notifications] Found existing subscription');
      try {
        // Vérifier si la souscription est toujours valide
        const subscriptionJSON = subscription.toJSON();
        const { data: existingSubscription } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('interpreter_id', interpreterId)
          .eq('endpoint', subscriptionJSON.endpoint)
          .single();

        if (existingSubscription && existingSubscription.status === 'active') {
          console.log('[Push Notifications] Found valid existing subscription in database');
          return true;
        }
      } catch (error) {
        console.log('[Push Notifications] Error checking existing subscription:', error);
        // Si erreur, on continue pour créer une nouvelle souscription
      }
    }

    // Request notification permission with proper error handling
    console.log('[Push Notifications] Requesting notification permission');
    const permission = await Notification.requestPermission();
    console.log('[Push Notifications] Permission status:', permission);
    
    if (permission !== 'granted') {
      console.error('[Push Notifications] Permission denied by user');
      throw new Error('Notification permission denied');
    }

    // Get VAPID public key
    console.log('[Push Notifications] Retrieving VAPID public key');
    const { data, error } = await supabase.functions.invoke(
      'get-vapid-public-key',
      { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (error) {
      console.error('[Push Notifications] Error getting VAPID key:', error);
      throw error;
    }
    
    if (!data?.vapidPublicKey) {
      console.error('[Push Notifications] No VAPID key in response:', data);
      throw new Error('No VAPID key received');
    }
    
    console.log('[Push Notifications] Successfully retrieved VAPID key');
    
    // Convert VAPID key
    const applicationServerKey = urlBase64ToUint8Array(data.vapidPublicKey);

    // Si une souscription existe, la désactiver
    if (subscription) {
      console.log('[Push Notifications] Unsubscribing from existing subscription');
      await subscription.unsubscribe();
    }

    // Subscribe to push notifications
    console.log('[Push Notifications] Creating new push subscription...');
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    console.log('[Push Notifications] Push subscription created:', subscription);

    const subscriptionJSON = subscription.toJSON();
    console.log('[Push Notifications] Subscription JSON:', subscriptionJSON);

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
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
    console.error('[Push Notifications] Critical error in subscription process:', error);
    console.error('[Push Notifications] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
}

export async function unsubscribeFromPushNotifications(interpreterId: string) {
  try {
    console.log('[Push Notifications] Starting unsubscribe process for interpreter:', interpreterId);
    
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('[Push Notifications] Found active subscription, unsubscribing...');
      await subscription.unsubscribe();
      
      console.log('[Push Notifications] Removing subscription from database');
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('interpreter_id', interpreterId)
        .eq('endpoint', subscription.endpoint);

      if (error) {
        console.error('[Push Notifications] Error removing subscription from database:', error);
        throw error;
      }

      console.log('[Push Notifications] Successfully unsubscribed from push notifications');
    } else {
      console.log('[Push Notifications] No active subscription found');
    }

    return true;
  } catch (error) {
    console.error('[Push Notifications] Error in unsubscribe process:', error);
    console.error('[Push Notifications] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
}

export async function sendTestNotification(interpreterId: string) {
  try {
    console.log('[Push Notifications] Sending test notification to interpreter:', interpreterId);
    
    const { data, error } = await supabase.functions.invoke(
      'send-push-notification',
      {
        method: 'POST',
        body: {
          message: {
            interpreterIds: [interpreterId],
            title: 'Test Notification',
            body: 'This is a test notification. If you receive this, push notifications are working correctly!',
            data: {
              mission_type: 'test',
              source_language: 'Test',
              target_language: 'Test',
              estimated_duration: 5,
              url: '/',
              mission_id: 'test'
            }
          }
        }
      }
    );

    if (error) {
      console.error('[Push Notifications] Error sending test notification:', error);
      throw error;
    }

    console.log('[Push Notifications] Test notification sent successfully:', data);
    return data;
  } catch (error) {
    console.error('[Push Notifications] Error in sendTestNotification:', error);
    throw error;
  }
}
