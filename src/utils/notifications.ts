import { supabase } from "@/integrations/supabase/client";

const ONESIGNAL_APP_ID = "2f15c47a-f369-4206-b077-eaddd8075b04";
let oneSignalInitialized = false;

// Check if browser supports notifications
const isBrowserSupported = (): boolean => {
  // Check for basic notification support
  if (!('Notification' in window)) {
    console.log('[OneSignal] Basic notifications not supported');
    return false;
  }

  // Check for service worker support (required for push notifications)
  if (!('serviceWorker' in navigator)) {
    console.log('[OneSignal] Service Workers not supported');
    return false;
  }

  // Check if it's a secure context (required for notifications)
  if (!window.isSecureContext) {
    console.log('[OneSignal] Not in a secure context');
    return false;
  }

  return true;
};

// Initialize OneSignal only when needed
const initializeOneSignal = async (): Promise<boolean> => {
  if (oneSignalInitialized) {
    console.log('[OneSignal] Already initialized');
    return true;
  }

  try {
    // Check browser support first
    if (!isBrowserSupported()) {
      console.error('[OneSignal] Browser does not support required features');
      throw new Error('Browser does not support required features');
    }

    if (!window.OneSignal) {
      console.error('[OneSignal] OneSignal script not loaded');
      throw new Error('OneSignal not loaded');
    }

    console.log('[OneSignal] Initializing...');
    await window.OneSignal.init({
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
    throw error; // Propagate error for better handling
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    // First check browser support
    if (!isBrowserSupported()) {
      throw new Error('Votre navigateur ne supporte pas les notifications');
    }

    // Initialize OneSignal
    await initializeOneSignal();

    // Get existing permission first
    const permission = await Notification.requestPermission();
    console.log('[OneSignal] Browser permission:', permission);

    if (permission === 'granted') {
      // Try OneSignal registration
      try {
        const registered = await registerDevice();
        if (registered) {
          console.log('[OneSignal] Device registered successfully');
          return true;
        }
      } catch (registerError) {
        console.error('[OneSignal] Registration error:', registerError);
        throw new Error('Impossible d'activer les notifications OneSignal');
      }
    } else {
      throw new Error('Veuillez autoriser les notifications dans les paramètres de votre navigateur');
    }

    return false;
  } catch (error: any) {
    console.error('[OneSignal] Permission error:', error);
    throw error; // Propagate the error with user-friendly message
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
  if (!isBrowserSupported()) {
    return 'denied';
  }

  try {
    return Notification.permission;
  } catch (error) {
    console.error('[OneSignal] Error checking permission:', error);
    return 'denied';
  }
};

// Check if notifications are currently enabled
export const isNotificationsEnabled = async (): Promise<boolean> => {
  if (!isBrowserSupported()) {
    return false;
  }

  try {
    const permission = await getNotificationPermission();
    if (permission !== 'granted') {
      return false;
    }

    // Only check OneSignal if we have browser permission
    if (window.OneSignal) {
      return await window.OneSignal.isPushNotificationsEnabled();
    }

    return false;
  } catch (error) {
    console.error('[OneSignal] Error checking notification status:', error);
    return false;
  }
};
