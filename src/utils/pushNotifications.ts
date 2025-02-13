
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Utility to convert a base64 string to Uint8Array
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
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('[Push] Service Worker registered');

    // Get push subscription
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Save subscription to database
    const { error: saveError } = await supabase
      .from('push_subscriptions')
      .upsert({
        interpreter_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))),
        user_agent: navigator.userAgent,
        status: 'active'
      }, {
        onConflict: 'interpreter_id,endpoint',
      });

    if (saveError) {
      console.error('[Push] Error saving subscription:', saveError);
      throw saveError;
    }

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
        status: 'expired', // Changed from 'unsubscribed' to 'expired' to match the enum type
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
