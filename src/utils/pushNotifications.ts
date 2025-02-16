
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Validate base64url string format
const isValidBase64Url = (str: string): boolean => {
  return /^[-A-Za-z0-9_]*$/.test(str);
};

// Utility to safely encode binary data to base64url format
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  try {
    // Create a Uint8Array view of the buffer
    const view = new Uint8Array(buffer);
    
    // Process data in chunks to prevent stack overflow
    const chunks = [];
    for (let i = 0; i < view.length; i += 1024) {
      chunks.push(String.fromCharCode.apply(null, 
        Array.from(view.subarray(i, i + 1024))
      ));
    }
    
    // Join chunks and encode as base64
    const b64 = btoa(chunks.join(''));
    
    // Convert to base64url format
    return b64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (error) {
    console.error('[Push] Error in arrayBufferToBase64:', error);
    throw new Error('Failed to encode binary data');
  }
}

// Utility to convert a base64url string to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  try {
    // Validate input
    if (!isValidBase64Url(base64String)) {
      throw new Error('Invalid base64url string format');
    }

    // Convert from base64url to base64
    const b64 = base64String
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Add proper padding
    const padLen = (4 - (b64.length % 4)) % 4;
    const padded = b64 + '='.repeat(padLen);
    
    // Decode base64 to binary string
    const raw = atob(padded);
    
    // Convert to Uint8Array
    const buffer = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      buffer[i] = raw.charCodeAt(i);
    }
    
    return buffer;
  } catch (error) {
    console.error('[Push] Error in urlBase64ToUint8Array:', error);
    throw new Error('Invalid base64 string');
  }
}

// Helper to safely extract subscription keys
function getSubscriptionKeys(subscription: PushSubscription) {
  const p256dh = subscription.getKey('p256dh');
  const auth = subscription.getKey('auth');
  
  if (!p256dh || !auth) {
    throw new Error('Missing required encryption keys');
  }
  
  return {
    p256dh: arrayBufferToBase64(p256dh),
    auth: arrayBufferToBase64(auth)
  };
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
    const { data: vapidData, error: vapidError } = 
      await supabase.functions.invoke('get-vapid-public-key');

    if (vapidError || !vapidData?.vapidPublicKey) {
      console.error('[Push] Error getting VAPID key:', vapidError);
      throw new Error('Could not get VAPID key');
    }

    // Validate VAPID key format
    const isValidFormat = (key: string) => /^[A-Za-z0-9\-_]+$/.test(key);
    if (!isValidFormat(vapidData.vapidPublicKey)) {
      console.error('[Push] Invalid VAPID key format');
      throw new Error('Invalid VAPID key format');
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
        applicationServerKey: urlBase64ToUint8Array(vapidData.vapidPublicKey)
      });

      console.log('[Push] Push subscription obtained');

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Safely encode the subscription keys
      try {
        const keys = getSubscriptionKeys(subscription);
        console.log('[Push] Keys encoded successfully');

        // Save subscription to database
        const { error: saveError } = await supabase
          .from('push_subscriptions')
          .upsert({
            interpreter_id: user.id,
            endpoint: subscription.endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
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
