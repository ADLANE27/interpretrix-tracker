
import { supabase } from "@/integrations/supabase/client";

// Global state for subscription
let subscription: PushSubscription | null = null;

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

export async function subscribeToNotifications() {
  try {
    // Check if push notifications are supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.error('[Push] Push notifications not supported');
      return false;
    }

    // Get VAPID public key first to fail early if not available
    const { data: vapidData, error: vapidError } = 
      await supabase.functions.invoke('get-vapid-public-key');

    if (vapidError || !vapidData?.vapidPublicKey) {
      console.error('[Push] Error getting VAPID key:', vapidError);
      throw new Error('Could not get VAPID key');
    }

    // Check if we already have a subscription
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      throw new Error('Service worker not registered');
    }

    // Unsubscribe from any existing subscriptions
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      await existingSub.unsubscribe();
    }

    // Create new subscription
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidData.vapidPublicKey)
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get subscription keys
    const keys = getSubscriptionKeys(subscription);

    // Save subscription to database
    const { error: saveError } = await supabase.from('web_push_subscriptions').upsert({
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh_key: keys.p256dh,
      auth_key: keys.auth,
      user_agent: navigator.userAgent,
      status: 'active'
    }, {
      onConflict: 'user_id, endpoint',
    });

    if (saveError) {
      throw saveError;
    }

    return true;
  } catch (error) {
    console.error('[Push] Error subscribing to notifications:', error);
    throw error;
  }
}

export async function unsubscribeFromNotifications() {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      throw new Error('No service worker registration found');
    }

    const sub = await registration.pushManager.getSubscription();
    if (!sub) {
      throw new Error('No push subscription found');
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Update subscription status in database
    const { error: updateError } = await supabase.from('web_push_subscriptions')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('endpoint', sub.endpoint);

    if (updateError) {
      throw updateError;
    }

    // Unsubscribe from push manager
    await sub.unsubscribe();
    subscription = null;

    return true;
  } catch (error) {
    console.error('[Push] Error unsubscribing from notifications:', error);
    throw error;
  }
}

