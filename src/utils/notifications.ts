
import { supabase } from "@/integrations/supabase/client";

const ONESIGNAL_INIT_TIMEOUT = 10000; // 10 seconds timeout
const ONESIGNAL_CHECK_INTERVAL = 100; // Check every 100ms
let oneSignalInitialized = false;

// OneSignal initialization script with retry mechanism
const initializeOneSignal = async (): Promise<boolean> => {
  if (!window.OneSignal) {
    console.error('[OneSignal] OneSignal is not loaded');
    return false;
  }

  if (oneSignalInitialized) {
    console.log('[OneSignal] Already initialized');
    return true;
  }

  try {
    console.log('[OneSignal] Initializing...');
    window.OneSignal.init({
      appId: "2f15c47a-f369-4206-b077-eaddd8075b04",
      notifyButton: {
        enable: false,
      },
      allowLocalhostAsSecureOrigin: true,
    });

    // Wait for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check current permission status
    const permission = await Notification.permission;
    console.log('[OneSignal] Current permission:', permission);

    if (permission === 'granted') {
      const isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
      console.log('[OneSignal] Is subscribed:', isSubscribed);
      if (isSubscribed) {
        await registerDevice();
      }
    }

    oneSignalInitialized = true;
    console.log('[OneSignal] Initialization complete');
    return true;
  } catch (error) {
    console.error('[OneSignal] Initialization error:', error);
    return false;
  }
};

// Wait for OneSignal to be available and initialize it
const waitForOneSignal = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkOneSignal = async () => {
      // If OneSignal is available, initialize it
      if (window.OneSignal) {
        console.log('[OneSignal] OneSignal found, initializing...');
        const success = await initializeOneSignal();
        resolve(success);
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
  console.log('[OneSignal] Checking if notifications are supported...');
  const isOneSignalAvailable = await waitForOneSignal();
  console.log('[OneSignal] Notifications supported:', isOneSignalAvailable);
  return isOneSignalAvailable;
};

export const getNotificationPermission = (): NotificationPermission => {
  if (!window.OneSignal) return 'denied';
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    console.log('[OneSignal] Requesting notification permission...');
    const isAvailable = await waitForOneSignal();
    if (!isAvailable) {
      console.error('[OneSignal] OneSignal is not available');
      return false;
    }

    // Request permission through OneSignal
    console.log('[OneSignal] Showing native prompt...');
    const permission = await window.OneSignal.showNativePrompt();
    console.log('[OneSignal] Permission result:', permission);
    
    if (permission === 'granted') {
      console.log('[OneSignal] Permission granted, registering device...');
      await registerDevice();
    }
    
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
      return false;
    }

    // Get OneSignal Player ID
    console.log('[OneSignal] Getting player ID...');
    const playerId = await window.OneSignal.getUserId();
    if (!playerId) {
      console.error('[OneSignal] No player ID available');
      return false;
    }
    console.log('[OneSignal] Player ID:', playerId);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[OneSignal] User not authenticated:', userError);
      return false;
    }

    // Register subscription in database
    console.log('[OneSignal] Registering subscription in database...');
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
      return false;
    }

    // Get OneSignal Player ID
    const playerId = await window.OneSignal.getUserId();
    if (!playerId) {
      console.error('[OneSignal] No player ID available');
      return false;
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[OneSignal] User not authenticated:', userError);
      return false;
    }

    // Update subscription status in database
    console.log('[OneSignal] Unregistering device...');
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
