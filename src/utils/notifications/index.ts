
import { showCustomPermissionMessage } from "./permissionHandling";
import { playNotificationSound } from "../notificationSounds";

const SERVER_URL = 'http://localhost:3000';

// Utility to convert base64 to Uint8Array for VAPID key
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

export async function subscribeToNotifications() {
  try {
    // Check browser support
    if (!window.isSecureContext) {
      console.error('[Notifications] Not in a secure context');
      throw new Error('Notifications require a secure context (HTTPS)');
    }

    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      console.error('[Notifications] Required features not supported');
      throw new Error('Your browser does not support notifications');
    }

    // Handle permissions
    let permission = Notification.permission;
    
    if (permission === 'denied') {
      console.log('[Notifications] Permission denied');
      showCustomPermissionMessage();
      return false;
    }

    if (permission === 'default') {
      permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showCustomPermissionMessage();
        return false;
      }
    }

    // Set up service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    await navigator.serviceWorker.ready;

    try {
      // Get subscription from service worker
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Get VAPID key from Node.js server
      const vapidResponse = await fetch(`${SERVER_URL}/api/vapid/public-key`);
      if (!vapidResponse.ok) {
        throw new Error('Could not get VAPID key');
      }
      
      const { publicKey } = await vapidResponse.json();
      if (!publicKey) {
        throw new Error('Invalid VAPID key format');
      }

      // Subscribe to push notifications
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Format subscription data for server
      const subscriptionData = {
        endpoint: newSubscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode.apply(null, 
            new Uint8Array(newSubscription.getKey('p256dh') as ArrayBuffer))),
          auth: btoa(String.fromCharCode.apply(null, 
            new Uint8Array(newSubscription.getKey('auth') as ArrayBuffer)))
        },
        userAgent: navigator.userAgent
      };

      // Save subscription to Node.js server
      const saveResponse = await fetch(`${SERVER_URL}/api/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionData)
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save subscription');
      }

      // Preload notification sounds
      await Promise.all([
        playNotificationSound('immediate', true),
        playNotificationSound('scheduled', true)
      ]);

      return true;
    } catch (error) {
      console.error('[Notifications] Error in subscription process:', error);
      throw error;
    }
  } catch (error) {
    console.error('[Notifications] Subscription error:', error);
    if (error.name === 'NotAllowedError') {
      showCustomPermissionMessage();
    }
    throw error;
  }
}

export async function unsubscribeFromNotifications() {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      throw new Error('No service worker registration found');
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      throw new Error('No push subscription found');
    }

    // Unsubscribe from Node.js server
    const response = await fetch(`${SERVER_URL}/api/notifications/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint
      })
    });

    if (!response.ok) {
      throw new Error('Failed to unsubscribe from server');
    }

    // Unsubscribe from push manager
    await subscription.unsubscribe();
    return true;
  } catch (error) {
    console.error('[Notifications] Unsubscribe error:', error);
    throw error;
  }
}
