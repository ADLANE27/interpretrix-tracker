import { supabase } from "@/integrations/supabase/client";

const ONESIGNAL_INIT_TIMEOUT = 10000; // 10 seconds timeout
const ONESIGNAL_CHECK_INTERVAL = 100; // Check every 100ms

// OneSignal initialization script with retry mechanism
const initializeOneSignal = () => {
  if (!window.OneSignal) {
    console.error('[OneSignal] OneSignal is not loaded');
    return;
  }

  window.OneSignal.init({
    appId: "2f15c47a-f369-4206-b077-eaddd8075b04",
    notifyButton: {
      enable: false,
    },
    allowLocalhostAsSecureOrigin: true,
  });

  window.OneSignal.showSlidedownPrompt();
};

// Wait for OneSignal to be available
const waitForOneSignal = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkOneSignal = () => {
      // If OneSignal is available, resolve true
      if (window.OneSignal) {
        console.log('[OneSignal] Successfully loaded');
        resolve(true);
        return;
      }

      // If we've exceeded the timeout, resolve false
      if (Date.now() - startTime > ONESIGNAL_INIT_TIMEOUT) {
        console.error('[OneSignal] Timeout waiting for OneSignal to load');
        resolve(false);
        return;
      }

      // Otherwise, check again after interval
      setTimeout(checkOneSignal, ONESIGNAL_CHECK_INTERVAL);
    };

    checkOneSignal();
  });
};

export const isNotificationsSupported = async (): Promise<boolean> => {
  const isOneSignalAvailable = await waitForOneSignal();
  return isOneSignalAvailable;
};

export const getNotificationPermission = (): NotificationPermission => {
  if (!window.OneSignal) return 'denied';
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const isAvailable = await waitForOneSignal();
    if (!isAvailable) {
      console.error('[OneSignal] OneSignal is not loaded');
      return false;
    }

    // Initialize OneSignal if not already initialized
    initializeOneSignal();

    // Request permission through OneSignal
    const permission = await window.OneSignal.showNativePrompt();
    return permission === 'granted';
  } catch (error) {
    console.error('[OneSignal] Error requesting permission:', error);
    return false;
  }
};

export const registerDevice = async () => {
  try {
    if (!window.OneSignal) {
      console.error('[OneSignal] OneSignal is not loaded');
      return;
    }

    // Get OneSignal Player ID
    const playerId = await window.OneSignal.getUserId();
    if (!playerId) {
      console.error('[OneSignal] No player ID available');
      return;
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[OneSignal] User not authenticated:', userError);
      return;
    }

    // Register subscription in database
    const { error: subError } = await supabase
      .from('onesignal_subscriptions')
      .upsert({
        interpreter_id: user.id,
        player_id: playerId,
        platform: getPlatform(),
        user_agent: navigator.userAgent,
        status: 'active'
      }, {
        onConflict: 'interpreter_id,player_id'
      });

    if (subError) {
      console.error('[OneSignal] Error registering subscription:', subError);
      throw subError;
    }

    console.log('[OneSignal] Device registered successfully');
    return true;
  } catch (error) {
    console.error('[OneSignal] Error registering device:', error);
    return false;
  }
};

export const unregisterDevice = async () => {
  try {
    if (!window.OneSignal) {
      console.error('[OneSignal] OneSignal is not loaded');
      return;
    }

    // Get OneSignal Player ID
    const playerId = await window.OneSignal.getUserId();
    if (!playerId) {
      console.error('[OneSignal] No player ID available');
      return;
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[OneSignal] User not authenticated:', userError);
      return;
    }

    // Update subscription status in database
    const { error: updateError } = await supabase
      .from('onesignal_subscriptions')
      .update({
        status: 'unsubscribed',
        updated_at: new Date().toISOString()
      })
      .eq('interpreter_id', user.id)
      .eq('player_id', playerId);

    if (updateError) {
      console.error('[OneSignal] Error updating subscription:', updateError);
      throw updateError;
    }

    // Unsubscribe from OneSignal
    await window.OneSignal.setSubscription(false);

    console.log('[OneSignal] Device unregistered successfully');
    return true;
  } catch (error) {
    console.error('[OneSignal] Error unregistering device:', error);
    return false;
  }
};

const getPlatform = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/android/i.test(userAgent)) return 'android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
  return 'web';
};

// Storage functions for notification preferences
const NOTIFICATION_PREFERENCE_KEY = 'notificationPreference';

export const getSavedNotificationPreference = (): boolean => {
  return localStorage.getItem(NOTIFICATION_PREFERENCE_KEY) === 'true';
};

export const saveNotificationPreference = (enabled: boolean): void => {
  localStorage.setItem(NOTIFICATION_PREFERENCE_KEY, enabled.toString());
};

// Function to show native notification (fallback)
export const showNotification = (title: string, options: NotificationOptions = {}) => {
  if (!window.OneSignal) {
    console.error('[OneSignal] OneSignal is not loaded');
    return;
  }

  // OneSignal handles the notifications, no need for native notifications
  console.log('[OneSignal] Notification will be handled by OneSignal');
};
