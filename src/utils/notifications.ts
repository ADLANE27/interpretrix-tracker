
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

const ONESIGNAL_APP_ID = "2f15c47a-f369-4206-b077-eaddd8075b04";

// Register device with OneSignal and Supabase
const registerDevice = async (playerId: string) => {
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
  }

  return !error;
};

// Request notification permissions and register device
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (!window.OneSignal) {
      throw new Error('OneSignal not initialized');
    }

    // Show the OneSignal prompt
    await window.OneSignal.showSlidedownPrompt();
    
    const isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
    if (isSubscribed) {
      const playerId = await window.OneSignal.getUserId();
      if (playerId) {
        await registerDevice(playerId);
      }
      return true;
    }

    return false;
  } catch (error: any) {
    console.error('[OneSignal] Error:', error);
    toast({
      variant: "destructive",
      title: "Erreur",
      description: "Une erreur est survenue lors de l'activation des notifications"
    });
    return false;
  }
};

// Check if notifications are currently enabled
export const isNotificationsEnabled = async (): Promise<boolean> => {
  try {
    return window.OneSignal?.isPushNotificationsEnabled() || false;
  } catch (error) {
    console.error('[OneSignal] Status check error:', error);
    return false;
  }
};

// Unregister device from notifications
export const unregisterDevice = async (): Promise<boolean> => {
  try {
    if (!window.OneSignal) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const playerId = await window.OneSignal.getUserId();
    if (playerId) {
      await supabase
        .from('onesignal_subscriptions')
        .update({ status: 'unsubscribed' })
        .eq('interpreter_id', user.id)
        .eq('player_id', playerId);
    }

    await window.OneSignal.setSubscription(false);
    return true;
  } catch (error) {
    console.error('[OneSignal] Unregister error:', error);
    return false;
  }
};
