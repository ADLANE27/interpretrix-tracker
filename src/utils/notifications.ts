
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

const ONESIGNAL_APP_ID = "2f15c47a-f369-4206-b077-eaddd8075b04";

// Register device with OneSignal and Supabase
const registerDevice = async (playerId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

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

    if (!error) {
      await window.OneSignal.sendTag('interpreter_id', user.id);
      console.log('[OneSignal] Device registered successfully');
      return true;
    }

    console.error('[OneSignal] Error registering device:', error);
    return false;
  } catch (error) {
    console.error('[OneSignal] Error in registerDevice:', error);
    return false;
  }
};

// Request notification permissions and register device
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (!window.OneSignal) {
      console.error('[OneSignal] OneSignal not initialized');
      throw new Error('OneSignal not initialized');
    }

    // Check if already subscribed first
    const isAlreadySubscribed = await window.OneSignal.isPushNotificationsEnabled();
    if (isAlreadySubscribed) {
      console.log('[OneSignal] Already subscribed');
      const playerId = await window.OneSignal.getUserId();
      if (playerId) {
        await registerDevice(playerId);
      }
      return true;
    }

    // Show the OneSignal prompt
    console.log('[OneSignal] Showing subscription prompt');
    await window.OneSignal.showSlidedownPrompt();
    
    // Wait for subscription status change
    const isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
    console.log('[OneSignal] Subscription status after prompt:', isSubscribed);
    
    if (isSubscribed) {
      const playerId = await window.OneSignal.getUserId();
      if (playerId) {
        const registered = await registerDevice(playerId);
        if (!registered) {
          console.error('[OneSignal] Failed to register device');
          return false;
        }
      }
      return true;
    }

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
    if (playerId) {
      console.log('[OneSignal] Unregistering device with player ID:', playerId);
      
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
    }

    await window.OneSignal.setSubscription(false);
    console.log('[OneSignal] Subscription disabled');
    return true;
  } catch (error) {
    console.error('[OneSignal] Unregister error:', error);
    return false;
  }
};
