import { supabase } from "@/integrations/supabase/client";

const ONESIGNAL_APP_ID = "2f15c47a-f369-4206-b077-eaddd8075b04";

// Check if browser supports notifications
const isBrowserSupported = (): boolean => {
  if (!('Notification' in window)) {
    console.log('[OneSignal] Basic notifications not supported');
    return false;
  }

  if (!('serviceWorker' in navigator)) {
    console.log('[OneSignal] Service Workers not supported');
    return false;
  }

  if (!window.isSecureContext) {
    console.log('[OneSignal] Not in a secure context');
    return false;
  }

  if (!window.OneSignal) {
    console.log('[OneSignal] OneSignal SDK not loaded');
    return false;
  }

  return true;
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (!isBrowserSupported()) {
      throw new Error("Votre navigateur ne supporte pas les notifications");
    }

    // Check current permission
    const currentPermission = await window.OneSignal.getNotificationPermission();
    console.log('[OneSignal] Current permission:', currentPermission);

    if (currentPermission === 'denied') {
      throw new Error("Veuillez autoriser les notifications dans les paramètres de votre navigateur");
    }

    // Show the OneSignal prompt
    await window.OneSignal.showSlidedownPrompt();

    // Wait for permission response
    const permission = await window.OneSignal.getNotificationPermission();
    console.log('[OneSignal] Updated permission:', permission);

    if (permission === 'granted') {
      const registered = await registerDevice();
      if (registered) {
        console.log('[OneSignal] Device registered successfully');
        return true;
      }
    }

    return false;
  } catch (error: any) {
    console.error('[OneSignal] Permission error:', error);
    throw error;
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

    // Add interpreter tag
    await window.OneSignal.sendTag('role', 'interpreter');
    await window.OneSignal.sendTag('interpreter_id', user.id);

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

    // Remove tags
    await window.OneSignal.deleteTags(['role', 'interpreter_id']);

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

export const getNotificationPermission = async (): Promise<NotificationPermission> => {
  try {
    if (!isBrowserSupported()) {
      return 'denied';
    }

    return await window.OneSignal.getNotificationPermission();
  } catch (error) {
    console.error('[OneSignal] Error checking permission:', error);
    return 'denied';
  }
};

export const isNotificationsEnabled = async (): Promise<boolean> => {
  try {
    if (!isBrowserSupported()) {
      return false;
    }

    if (!window.OneSignal) {
      return false;
    }

    return await window.OneSignal.isPushNotificationsEnabled();
  } catch (error) {
    console.error('[OneSignal] Error checking notification status:', error);
    return false;
  }
};
