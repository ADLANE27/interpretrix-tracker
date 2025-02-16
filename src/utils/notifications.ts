
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ONESIGNAL_APP_ID = "2f15c47a-f369-4206-b077-eaddd8075b04";

// Helper to wait for OneSignal initialization
const waitForOneSignal = async (timeout = 10000): Promise<boolean> => {
  console.log('[OneSignal] Waiting for initialization...');
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (typeof window.OneSignal !== 'undefined') {
      try {
        await window.OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: '/OneSignalSDKWorker.js',
        });
        console.log('[OneSignal] Successfully initialized');
        return true;
      } catch (error) {
        console.log('[OneSignal] Waiting for initialization...', error);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.error('[OneSignal] Initialization timed out');
  return false;
};

// Check browser support for notifications
const checkBrowserSupport = async (): Promise<{ supported: boolean; reason?: string }> => {
  if (!('Notification' in window)) {
    return { supported: false, reason: 'Votre navigateur ne supporte pas les notifications' };
  }

  if (!('serviceWorker' in navigator)) {
    return { supported: false, reason: 'Votre navigateur ne supporte pas les Service Workers' };
  }

  if (!window.isSecureContext) {
    return { supported: false, reason: 'Les notifications nécessitent une connexion sécurisée (HTTPS)' };
  }

  return { supported: true };
};

// Register device with OneSignal and Supabase
const registerDevice = async (): Promise<boolean> => {
  try {
    if (!window.OneSignal) {
      throw new Error('OneSignal n\'est pas initialisé');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Get OneSignal Player ID
    const playerId = await window.OneSignal.getUserId();
    if (!playerId) {
      throw new Error('Impossible d\'obtenir l\'identifiant OneSignal');
    }

    // Register subscription in database
    const { error: subError } = await supabase
      .from('onesignal_subscriptions')
      .upsert({
        interpreter_id: user.id,
        player_id: playerId,
        platform: 'web',
        status: 'active',
        user_agent: navigator.userAgent,
      });

    if (subError) throw subError;

    // Add interpreter tags
    await window.OneSignal.sendTag('role', 'interpreter');
    await window.OneSignal.sendTag('interpreter_id', user.id);

    console.log('[OneSignal] Device registered successfully');
    return true;
  } catch (error) {
    console.error('[OneSignal] Registration error:', error);
    return false;
  }
};

// Update subscription status in database
const updateSubscriptionStatus = async (status: 'active' | 'unsubscribed' | 'blocked'): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const playerId = await window.OneSignal.getUserId();
    if (!playerId) return false;

    const { error } = await supabase
      .from('onesignal_subscriptions')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('interpreter_id', user.id)
      .eq('player_id', playerId);

    return !error;
  } catch (error) {
    console.error('[OneSignal] Status update error:', error);
    return false;
  }
};

// Request notification permissions and register device
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    // Check browser support
    const { supported, reason } = await checkBrowserSupport();
    if (!supported) {
      throw new Error(reason || 'Les notifications ne sont pas supportées');
    }

    // Wait for OneSignal initialization
    const isReady = await waitForOneSignal();
    if (!isReady) {
      throw new Error('L\'initialisation des notifications a échoué');
    }

    // Check current permission
    const currentPermission = await window.OneSignal.getNotificationPermission();
    if (currentPermission === 'denied') {
      throw new Error('Les notifications sont bloquées dans les paramètres du navigateur');
    }

    // Show the OneSignal prompt
    await window.OneSignal.showSlidedownPrompt();
    
    // Wait for permission response
    const permission = await window.OneSignal.getNotificationPermission();
    if (permission === 'granted') {
      const registered = await registerDevice();
      if (!registered) {
        throw new Error('Erreur lors de l\'enregistrement du dispositif');
      }
      return true;
    }

    return false;
  } catch (error: any) {
    console.error('[OneSignal] Permission error:', error);
    throw error;
  }
};

// Unregister device from notifications
export const unregisterDevice = async (): Promise<boolean> => {
  try {
    if (!window.OneSignal) return false;

    // Update subscription status in database
    await updateSubscriptionStatus('unsubscribed');

    // Remove tags
    await window.OneSignal.deleteTags(['role', 'interpreter_id']);

    // Unsubscribe from OneSignal
    await window.OneSignal.setSubscription(false);

    console.log('[OneSignal] Device unregistered successfully');
    return true;
  } catch (error) {
    console.error('[OneSignal] Unregister error:', error);
    return false;
  }
};

// Check if notifications are currently enabled
export const isNotificationsEnabled = async (): Promise<boolean> => {
  try {
    if (!window.OneSignal) return false;

    const { supported } = await checkBrowserSupport();
    if (!supported) return false;

    return await window.OneSignal.isPushNotificationsEnabled();
  } catch (error) {
    console.error('[OneSignal] Status check error:', error);
    return false;
  }
};

