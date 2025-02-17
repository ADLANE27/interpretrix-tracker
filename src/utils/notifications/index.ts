
import { supabase } from "@/integrations/supabase/client";
import { showCustomPermissionMessage } from "./permissionHandling";
import { playNotificationSound } from "../notificationSounds";

const SERVER_URL = 'http://localhost:3000'; // Node.js notification server URL

export async function subscribeToNotifications() {
  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

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

      // Get VAPID key from notification server
      const response = await fetch(`${SERVER_URL}/api/vapid/public-key`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Could not get VAPID key from server');
      }

      const { publicKey } = await response.json();

      // Subscribe to push notifications
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey
      });

      // Get device info
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenSize: `${window.screen.width}x${window.screen.height}`
      };

      // Save subscription to notification server
      const saveResponse = await fetch(`${SERVER_URL}/api/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          subscription: newSubscription,
          deviceInfo
        })
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save subscription to server');
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      throw new Error('No service worker registration found');
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      throw new Error('No push subscription found');
    }

    // Notify server about unsubscription
    const response = await fetch(`${SERVER_URL}/api/notifications/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint
      })
    });

    if (!response.ok) {
      throw new Error('Failed to unsubscribe on server');
    }

    // Unsubscribe from push manager
    await subscription.unsubscribe();
    return true;
  } catch (error) {
    console.error('[Notifications] Unsubscribe error:', error);
    throw error;
  }
}
