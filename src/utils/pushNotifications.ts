
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Utility to safely encode binary data to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  // First, create a Uint8Array from the buffer
  const bytes = new Uint8Array(buffer);
  // Then convert the bytes to a string
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // Finally, safely encode to base64
  return window.btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Utility to convert a base64 string to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  try {
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  } catch (error) {
    console.error('[Push] Error converting base64 to Uint8Array:', error);
    throw new Error('Invalid base64 string');
  }
}

export async function registerPushNotifications() {
  const { toast } = useToast();

  try {
    // Check if push notifications are supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.error('[Push] Push notifications not supported');
      toast({
        title: "Non supporté",
        description: "Votre navigateur ne supporte pas les notifications push",
        variant: "destructive",
      });
      return false;
    }

    // Get VAPID public key
    const { data: { vapidPublicKey }, error: vapidError } = 
      await supabase.functions.invoke('get-vapid-public-key');

    if (vapidError || !vapidPublicKey) {
      console.error('[Push] Error getting VAPID key:', vapidError);
      throw new Error('Could not get VAPID key');
    }

    // Register service worker if not already registered
    let registration;
    try {
      registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('[Push] Service Worker registered');
    } catch (error) {
      console.error('[Push] Service Worker registration failed:', error);
      throw new Error('Could not register service worker');
    }

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    console.log('[Push] Service Worker ready');

    // Get push subscription
    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('[Push] Push subscription obtained:', subscription);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Safely encode the subscription keys
      const p256dhKey = arrayBufferToBase64(subscription.getKey('p256dh')!);
      const authKey = arrayBufferToBase64(subscription.getKey('auth')!);

      console.log('[Push] Saving subscription to database...');

      // Save subscription to database
      const { error: saveError } = await supabase
        .from('push_subscriptions')
        .upsert({
          interpreter_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: p256dhKey,
          auth: authKey,
          user_agent: navigator.userAgent,
          status: 'active'
        }, {
          onConflict: 'interpreter_id,endpoint',
        });

      if (saveError) {
        console.error('[Push] Error saving subscription:', saveError);
        throw saveError;
      }

      console.log('[Push] Subscription saved successfully');

      // Send test notification
      console.log('[Push] Sending test notification...');
      const { error: testError } = await supabase.functions.invoke('send-test-notification', {
        body: { interpreterId: user.id }
      });

      if (testError) {
        console.error('[Push] Error sending test notification:', testError);
        throw testError;
      }

      toast({
        title: "Notifications activées",
        description: "Vous allez recevoir une notification de test",
      });

      return true;

    } catch (subscriptionError: any) {
      console.error('[Push] Error subscribing to push:', subscriptionError);
      throw new Error(subscriptionError.message || 'Could not subscribe to push notifications');
    }

  } catch (error: any) {
    console.error('[Push] Error registering push notifications:', error);
    
    toast({
      title: "Erreur",
      description: error.message || "Une erreur est survenue lors de l'activation des notifications",
      variant: "destructive",
    });
    
    return false;
  }
}

export async function unregisterPushNotifications() {
  const { toast } = useToast();

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      throw new Error('No service worker registration found');
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      throw new Error('No push subscription found');
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Update subscription status in database
    const { error: updateError } = await supabase
      .from('push_subscriptions')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('interpreter_id', user.id)
      .eq('endpoint', subscription.endpoint);

    if (updateError) {
      console.error('[Push] Error updating subscription:', updateError);
      throw updateError;
    }

    // Unsubscribe from push manager
    await subscription.unsubscribe();

    toast({
      title: "Notifications désactivées",
      description: "Vous ne recevrez plus de notifications push",
    });

    return true;

  } catch (error: any) {
    console.error('[Push] Error unregistering push notifications:', error);
    
    toast({
      title: "Erreur",
      description: error.message || "Une erreur est survenue lors de la désactivation des notifications",
      variant: "destructive",
    });
    
    return false;
  }
}
