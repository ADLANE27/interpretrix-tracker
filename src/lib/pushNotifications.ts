
import { supabase } from "@/integrations/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  try {
    if (!base64String || typeof base64String !== 'string') {
      throw new Error('Invalid base64 input');
    }
    
    console.log('[Push Notifications] Converting base64:', base64String);
    
    const base64 = base64String
      .replace(/-/g, '+')
      .replace(/_/g, '/');
      
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const base64Padded = base64 + padding;
    
    console.log('[Push Notifications] Padded base64:', base64Padded);

    const rawData = window.atob(base64Padded);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    console.log('[Push Notifications] Successfully converted to Uint8Array');
    return outputArray;
  } catch (error) {
    console.error('[Push Notifications] Base64 conversion error:', error);
    console.error('[Push Notifications] Input string:', base64String);
    throw new Error('Failed to convert VAPID key. Please check the key format.');
  }
}

export async function subscribeToPushNotifications(interpreterId: string): Promise<boolean> {
  try {
    console.log('[Push Notifications] Starting subscription process');

    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      console.error('[Push Notifications] Browser does not support notifications');
      throw new Error('Les notifications push ne sont pas supportées par votre navigateur');
    }

    // First check if permission is already granted before requesting
    const currentPermission = Notification.permission;
    console.log('[Push Notifications] Current permission:', currentPermission);

    if (currentPermission === 'denied') {
      throw new Error('Les notifications sont bloquées par le navigateur');
    }

    // Register service worker first
    console.log('[Push Notifications] Setting up service worker');
    let serviceWorkerReg = await navigator.serviceWorker.getRegistration();
    
    if (!serviceWorkerReg) {
      console.log('[Push Notifications] No service worker found, registering new one');
      serviceWorkerReg = await navigator.serviceWorker.register('/sw.js');
    }

    // Wait for the service worker to be ready
    if (serviceWorkerReg.installing || serviceWorkerReg.waiting) {
      console.log('[Push Notifications] Waiting for service worker to be ready');
      await new Promise<void>((resolve) => {
        const worker = serviceWorkerReg!.installing || serviceWorkerReg!.waiting;
        if (!worker) {
          resolve();
          return;
        }
        
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') {
            console.log('[Push Notifications] Service worker activated');
            resolve();
          }
        });
      });
    }

    // Check for existing subscription
    const existingSubscription = await serviceWorkerReg.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('[Push Notifications] Found existing subscription');
      
      // Verify if the subscription is still valid in our database
      const { data: existingDbSub } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('interpreter_id', interpreterId)
        .eq('endpoint', existingSubscription.endpoint)
        .eq('status', 'active')
        .single();

      if (existingDbSub) {
        console.log('[Push Notifications] Subscription already active in database');
        return true;
      }

      // If not in database, unsubscribe and create new subscription
      console.log('[Push Notifications] Cleaning up old subscription');
      await existingSubscription.unsubscribe();
    }

    // If permission is not granted yet, request it
    if (currentPermission === 'default') {
      console.log('[Push Notifications] Requesting permission');
      const permissionResult = await Notification.requestPermission();
      console.log('[Push Notifications] Permission result:', permissionResult);
      
      if (permissionResult !== 'granted') {
        throw new Error('Permission refusée pour les notifications');
      }
    }

    // Get VAPID key and create subscription
    console.log('[Push Notifications] Fetching VAPID key');
    const { data: vapidData, error: vapidError } = await supabase.functions.invoke(
      'get-vapid-public-key',
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (vapidError) {
      console.error('[Push Notifications] VAPID key error:', vapidError);
      throw vapidError;
    }

    if (!vapidData?.vapidPublicKey) {
      console.error('[Push Notifications] No VAPID key in response:', vapidData);
      throw new Error('Clé VAPID non reçue');
    }

    console.log('[Push Notifications] Got VAPID key:', vapidData.vapidPublicKey);
    
    const applicationServerKey = urlBase64ToUint8Array(vapidData.vapidPublicKey);
    console.log('[Push Notifications] Converted VAPID key to Uint8Array');

    // Create new subscription
    console.log('[Push Notifications] Creating new push subscription');
    const subscription = await serviceWorkerReg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    console.log('[Push Notifications] Push subscription:', subscription);

    const subscriptionJSON = subscription.toJSON();
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
      console.error('[Push Notifications] Error saving subscription:', insertError);
      throw insertError;
    }

    console.log('[Push Notifications] Subscription saved successfully');
    return true;

  } catch (error) {
    console.error('[Push Notifications] Subscription error:', error);
    throw error;
  }
}

export async function unsubscribeFromPushNotifications(interpreterId: string): Promise<boolean> {
  try {
    console.log('[Push Notifications] Starting unsubscribe process');
    
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    for (const registration of registrations) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('interpreter_id', interpreterId)
          .eq('endpoint', subscription.endpoint);

        if (error) throw error;
      }
      
      await registration.unregister();
    }

    return true;
  } catch (error) {
    console.error('[Push Notifications] Unsubscribe error:', error);
    throw error;
  }
}

export async function sendTestNotification(interpreterId: string): Promise<void> {
  try {
    console.log('[Push Notifications] Sending test notification');
    
    const registration = await navigator.serviceWorker.ready;
    if (!registration.pushManager) {
      throw new Error('Push manager not found');
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      throw new Error('No push subscription found');
    }

    const { error } = await supabase.functions.invoke(
      'send-push-notification',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: {
            interpreterIds: [interpreterId],
            title: 'Test de notification',
            body: 'Cette notification est un test pour vérifier que tout fonctionne correctement.',
            data: {
              type: 'test'
            }
          }
        }
      }
    );

    if (error) throw error;

  } catch (error) {
    console.error('[Push Notifications] Test notification error:', error);
    throw error;
  }
}
