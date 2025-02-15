
import { supabase } from "@/integrations/supabase/client";

const ONESIGNAL_APP_ID = "2f15c47a-f369-4206-b077-eaddd8075b04";
let oneSignalInitialized = false;

// Initialize OneSignal only when needed
const initializeOneSignal = async (): Promise<boolean> => {
  if (oneSignalInitialized) {
    console.log('[OneSignal] Already initialized');
    return true;
  }

  try {
    if (!window.OneSignal) {
      console.error('[OneSignal] OneSignal is not loaded');
      return false;
    }

    console.log('[OneSignal] Initializing...');
    window.OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      notifyButton: {
        enable: false,
      },
      allowLocalhostAsSecureOrigin: true,
    });

    oneSignalInitialized = true;
    console.log('[OneSignal] Initialized successfully');
    return true;
  } catch (error) {
    console.error('[OneSignal] Initialization error:', error);
    return false;
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    // First check if notifications are supported
    if (!('Notification' in window)) {
      console.log('[OneSignal] Notifications not supported');
      return false;
    }

    // Initialize OneSignal if not already done
    const initialized = await initializeOneSignal();
    if (!initialized) {
      console.error('[OneSignal] Failed to initialize OneSignal');
      return false;
    }

    // Show the browser's native notification prompt
    console.log('[OneSignal] Requesting permission...');
    const permission = await window.OneSignal.showNativePrompt();
    console.log('[OneSignal] Permission result:', permission);

    if (permission === 'granted') {
      // Register the device with OneSignal
      const registered = await registerDevice();
      if (registered) {
        console.log('[OneSignal] Device registered successfully');
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('[OneSignal] Error requesting permission:', error);
    return false;
  }
};

export const registerDevice = async (): Promise<boolean> => {
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
    console.log('[OneSignal] Registering subscription...');
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
      return false;
    }

    console.log('[OneSignal] Subscription registered successfully');
    return true;
  } catch (error) {
    console.error('[OneSignal] Error registering device:', error);
    return false;
  }
};

export const unregisterDevice = async (): Promise<boolean> => {
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

    // Update subscription status
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
      return false;
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

const getPlatform = (): string => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/android/i.test(userAgent)) return 'android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
  return 'web';
};

// Simplified permission check
export const getNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
};

// Check if notifications are currently enabled
export const isNotificationsEnabled = async (): Promise<boolean> => {
  try {
    if (!window.OneSignal) return false;
    return await window.OneSignal.isPushNotificationsEnabled();
  } catch (error) {
    console.error('[OneSignal] Error checking notification status:', error);
    return false;
  }
};
