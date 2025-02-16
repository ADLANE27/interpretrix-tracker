
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { playNotificationSound } from "@/utils/notificationSounds";

const ONESIGNAL_APP_ID = "2f15c47a-f369-4206-b077-eaddd8075b04";

// Wait for OneSignal initialization
const waitForOneSignal = async () => {
  try {
    console.log('[OneSignal] Waiting for initialization...');
    await window.oneSignalInitPromise;
    console.log('[OneSignal] Initialization confirmed');
    return true;
  } catch (error) {
    console.error('[OneSignal] Error waiting for initialization:', error);
    return false;
  }
};

// Register device with OneSignal and Supabase
const registerDevice = async (playerId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[OneSignal] No authenticated user');
      return false;
    }

    console.log('[OneSignal] Registering device for user:', user.id);

    // Register subscription in database
    const { error } = await supabase
      .from('onesignal_subscriptions')
      .upsert({
        interpreter_id: user.id,
        player_id: playerId,
        platform: 'web',
        status: 'active',
        user_agent: navigator.userAgent,
      });

    if (error) {
      console.error('[OneSignal] Error registering device:', error);
      return false;
    }

    // Set interpreter ID tag
    try {
      await window.OneSignal.sendTag('interpreter_id', user.id);
      console.log('[OneSignal] Device registered successfully');
      return true;
    } catch (tagError) {
      console.error('[OneSignal] Error setting tag:', tagError);
      return false;
    }
  } catch (error) {
    console.error('[OneSignal] Error in registerDevice:', error);
    return false;
  }
};

// Request notification permissions and register device
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    console.log('[OneSignal] Starting permission request...');
    
    // Wait for OneSignal initialization
    const initialized = await waitForOneSignal();
    if (!initialized) {
      throw new Error('OneSignal non initialisé');
    }

    if (!window.OneSignal) {
      console.error('[OneSignal] OneSignal not available');
      throw new Error('OneSignal non disponible');
    }

    // First check if already subscribed
    const isAlreadySubscribed = await window.OneSignal.isPushNotificationsEnabled();
    console.log('[OneSignal] Already subscribed:', isAlreadySubscribed);

    if (isAlreadySubscribed) {
      const playerId = await window.OneSignal.getUserId();
      if (playerId) {
        return await registerDevice(playerId);
      }
      return true;
    }

    // If not subscribed, show the prompt
    console.log('[OneSignal] Showing subscription prompt');
    await window.OneSignal.showSlidedownPrompt();
    
    // Wait for subscription status change with timeout
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      const isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
      console.log('[OneSignal] Checking subscription status:', isSubscribed);
      
      if (isSubscribed) {
        const playerId = await window.OneSignal.getUserId();
        if (playerId) {
          const registered = await registerDevice(playerId);
          if (!registered) {
            console.error('[OneSignal] Failed to register device');
            return false;
          }
          // Play a test notification sound
          playNotificationSound('scheduled');
          return true;
        }
      }
      
      // Wait 500ms before next check
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    console.log('[OneSignal] Subscription attempt timed out');
    return false;
  } catch (error: any) {
    console.error('[OneSignal] Error:', error);
    toast({
      variant: "destructive",
      title: "Erreur",
      description: error.message || "Une erreur est survenue lors de l'activation des notifications"
    });
    return false;
  }
};

// Check if notifications are currently enabled
export const isNotificationsEnabled = async (): Promise<boolean> => {
  try {
    if (!window.OneSignal) {
      console.log('[OneSignal] OneSignal not initialized');
      return false;
    }

    const isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
    console.log('[OneSignal] Current subscription status:', isSubscribed);
    
    if (isSubscribed) {
      const playerId = await window.OneSignal.getUserId();
      if (!playerId) {
        console.log('[OneSignal] No player ID found');
        return false;
      }

      // Verify subscription in database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[OneSignal] No authenticated user');
        return false;
      }

      const { data: subscription } = await supabase
        .from('onesignal_subscriptions')
        .select('status')
        .eq('interpreter_id', user.id)
        .eq('player_id', playerId)
        .single();

      console.log('[OneSignal] Database subscription status:', subscription?.status);
      return subscription?.status === 'active';
    }

    return false;
  } catch (error) {
    console.error('[OneSignal] Status check error:', error);
    return false;
  }
};

// Unregister device from notifications
export const unregisterDevice = async (): Promise<boolean> => {
  try {
    if (!window.OneSignal) {
      console.error('[OneSignal] OneSignal not initialized');
      return false;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[OneSignal] No authenticated user');
      return false;
    }

    const playerId = await window.OneSignal.getUserId();
    if (!playerId) {
      console.error('[OneSignal] No player ID found');
      return false;
    }

    console.log('[OneSignal] Unregistering device with player ID:', playerId);
    
    // Update database first
    const { error } = await supabase
      .from('onesignal_subscriptions')
      .update({ 
        status: 'unsubscribed',
        updated_at: new Date().toISOString()
      })
      .eq('interpreter_id', user.id)
      .eq('player_id', playerId);

    if (error) {
      console.error('[OneSignal] Error updating subscription:', error);
      return false;
    }

    // Then disable OneSignal subscription
    await window.OneSignal.setSubscription(false);
    console.log('[OneSignal] Subscription disabled successfully');
    return true;
  } catch (error) {
    console.error('[OneSignal] Unregister error:', error);
    return false;
  }
};
