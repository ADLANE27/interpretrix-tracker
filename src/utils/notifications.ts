
import { supabase } from "@/integrations/supabase/client";

const ONESIGNAL_APP_ID = "2f15c47a-f369-4206-b077-eaddd8075b04";

// Enhanced browser support check with detailed logging
const isBrowserSupported = async (): Promise<{ supported: boolean; reason?: string }> => {
  // Check basic notification support
  if (!('Notification' in window)) {
    console.log('[OneSignal] Basic notifications not supported');
    return { supported: false, reason: 'notifications_not_supported' };
  }

  // Check service worker support
  if (!('serviceWorker' in navigator)) {
    console.log('[OneSignal] Service Workers not supported');
    return { supported: false, reason: 'service_worker_not_supported' };
  }

  // Check secure context (HTTPS)
  if (!window.isSecureContext) {
    console.log('[OneSignal] Not in a secure context');
    return { supported: false, reason: 'not_secure_context' };
  }

  // Check OneSignal SDK
  if (typeof window.OneSignal === 'undefined') {
    console.log('[OneSignal] OneSignal SDK not loaded');
    return { supported: false, reason: 'onesignal_not_loaded' };
  }

  // Check if OneSignal is ready by attempting to get its state
  try {
    await window.OneSignal.getNotificationPermission();
    return { supported: true };
  } catch (error) {
    console.log('[OneSignal] OneSignal not ready');
    return { supported: false, reason: 'onesignal_not_ready' };
  }
};

// Wait for OneSignal to be ready with more robust checking
const waitForOneSignal = async (timeout = 10000): Promise<boolean> => {
  console.log('[OneSignal] Waiting for initialization...');
  const start = Date.now();
  
  // First, wait for the OneSignal object to be available
  while (Date.now() - start < timeout) {
    if (typeof window.OneSignal !== 'undefined') {
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (typeof window.OneSignal === 'undefined') {
    console.error('[OneSignal] OneSignal object not found after timeout');
    return false;
  }

  // Then wait for successful API call
  const apiCheckStart = Date.now();
  while (Date.now() - apiCheckStart < timeout) {
    try {
      await window.OneSignal.getNotificationPermission();
      console.log('[OneSignal] Successfully initialized');
      return true;
    } catch (error) {
      console.log('[OneSignal] Waiting for initialization...', error);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.error('[OneSignal] Initialization timed out');
  return false;
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    // Wait for OneSignal to be ready with increased timeout
    const isReady = await waitForOneSignal(15000); // Increased timeout to 15 seconds
    if (!isReady) {
      console.error('[OneSignal] Timeout waiting for OneSignal initialization');
      throw new Error("L'initialisation des notifications a échoué");
    }

    // Check browser support
    const { supported, reason } = await isBrowserSupported();
    if (!supported) {
      console.error('[OneSignal] Browser support check failed:', reason);
      
      // Map reason to user-friendly error message
      const errorMessages: Record<string, string> = {
        notifications_not_supported: "Votre navigateur ne supporte pas les notifications",
        service_worker_not_supported: "Votre navigateur ne supporte pas les notifications",
        not_secure_context: "Les notifications requièrent une connexion sécurisée (HTTPS)",
        onesignal_not_loaded: "Le système de notifications n'est pas chargé",
        onesignal_not_ready: "Le système de notifications n'est pas initialisé"
      };

      throw new Error(errorMessages[reason] || "Votre navigateur ne supporte pas les notifications");
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

    // Wait for OneSignal to be ready
    await window.OneSignal.init({
      appId: "2f15c47a-f369-4206-b077-eaddd8075b04",
      allowLocalhostAsSecureOrigin: true,
    });

    // Get OneSignal Player ID with retry
    let playerId = null;
    let retryCount = 0;
    while (!playerId && retryCount < 3) {
      playerId = await window.OneSignal.getUserId();
      if (!playerId) {
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!playerId) {
      console.error('[OneSignal] Failed to get player ID after retries');
      return false;
    }
    console.log('[OneSignal] Player ID:', playerId);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[OneSignal] User not authenticated:', userError);
      return false;
    }

    // Register subscription in database with retry
    let subscriptionError = null;
    retryCount = 0;
    while (retryCount < 3) {
      const { error: subError } = await supabase
        .from('onesignal_subscriptions')
        .upsert({
          interpreter_id: user.id,
          player_id: playerId,
          platform: getPlatform(),
          user_agent: navigator.userAgent,
          status: 'active',
          notification_count: 0,
          last_notification_sent: null
        }, {
          onConflict: 'interpreter_id,player_id'
        });

      if (!subError) {
        subscriptionError = null;
        break;
      }

      subscriptionError = subError;
      retryCount++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (subscriptionError) {
      console.error('[OneSignal] Error registering subscription after retries:', subscriptionError);
      return false;
    }

    // Add interpreter tags
    await Promise.all([
      window.OneSignal.sendTag('role', 'interpreter'),
      window.OneSignal.sendTag('interpreter_id', user.id)
    ]);

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
    const { supported } = await isBrowserSupported();
    if (!supported) {
      return 'denied';
    }

    const isReady = await waitForOneSignal(10000);
    if (!isReady) {
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
    const { supported } = await isBrowserSupported();
    if (!supported) {
      return false;
    }

    const isReady = await waitForOneSignal(10000);
    if (!isReady) {
      return false;
    }

    return await window.OneSignal.isPushNotificationsEnabled();
  } catch (error) {
    console.error('[OneSignal] Error checking notification status:', error);
    return false;
  }
};

