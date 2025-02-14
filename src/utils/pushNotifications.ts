import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Utility to safely encode binary data to base64url format
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  try {
    // Convert ArrayBuffer to base64 using a more reliable method
    const uint8Array = new Uint8Array(buffer);
    const numbers = uint8Array;
    const length = numbers.length;
    const strings = new Array(length);
    for (let i = 0; i < length; i++) {
      strings[i] = String.fromCharCode(numbers[i]);
    }
    const base64 = btoa(strings.join(''));
    
    // Convert to base64url format
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } catch (error) {
    console.error('[Push] Error in arrayBufferToBase64:', error);
    throw new Error('Failed to encode binary data');
  }
}

// Utility to convert a base64url string to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  try {
    // Add missing padding
    const base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
    let base64 = base64String
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Add padding if needed
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }

    // Validate base64 string
    if (!base64Regex.test(base64)) {
      throw new Error('Invalid base64 format');
    }

    // Decode base64
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  } catch (error) {
    console.error('[Push] Error in urlBase64ToUint8Array:', error);
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
      await navigator.serviceWorker.ready;
      console.log('[Push] Service Worker registered and ready');
    } catch (error) {
      console.error('[Push] Service Worker registration failed:', error);
      throw new Error('Could not register service worker');
    }

    // Get push subscription
    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('[Push] Push subscription obtained');

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Safely encode the subscription keys
      try {
        const p256dhKey = arrayBufferToBase64(subscription.getKey('p256dh')!);
        const authKey = arrayBufferToBase64(subscription.getKey('auth')!);

        console.log('[Push] Keys encoded successfully');

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

      } catch (encodingError) {
        console.error('[Push] Error encoding subscription keys:', encodingError);
        throw new Error('Failed to encode subscription keys');
      }

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
