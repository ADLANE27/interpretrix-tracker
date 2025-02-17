
import { supabase } from "@/integrations/supabase/client";

// Global state for subscription
let subscription: PushSubscription | null = null;

const SERVER_URL = import.meta.env.VITE_NOTIFICATION_SERVER_URL || '/.netlify/functions/notification-server';

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

    console.log('[Push] Fetching VAPID key from:', `${SERVER_URL}/vapid/public-key`);

    // Get VAPID public key from server
    const response = await fetch(`${SERVER_URL}/vapid/public-key`);
    if (!response.ok) {
      console.error('[Push] Failed to get VAPID key, status:', response.status);
      throw new Error('Could not get VAPID key');
    }
    const { publicKey } = await response.json();
    console.log('[Push] Got VAPID public key');

    // Register service worker
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
    console.log('[Push] Subscribing to push notifications...');
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
    console.log('[Push] Push subscription created');

    // Get subscription keys
    const keys = getSubscriptionKeys(subscription);

    console.log('[Push] Saving subscription to server...');
    // Save subscription to server
    const saveResponse = await fetch(`${SERVER_URL}/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys,
        userAgent: navigator.userAgent
      })
    });

    if (!saveResponse.ok) {
      console.error('[Push] Failed to save subscription, status:', saveResponse.status);
      throw new Error('Failed to save subscription to server');
    }

    console.log('[Push] Subscription saved successfully');
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

    // Notify server about unsubscription
    const response = await fetch(`${SERVER_URL}/notifications/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        endpoint: sub.endpoint
      })
    });

    if (!response.ok) {
      throw new Error('Failed to unsubscribe on server');
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
