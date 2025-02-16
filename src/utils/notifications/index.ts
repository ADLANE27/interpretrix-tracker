
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { playNotificationSound } from "@/utils/notificationSounds";
import { getOneSignal, getPlayerId, setExternalUserId, setInterpreterTags } from './oneSignalSetup';

// Request notification permissions
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    console.log('[OneSignal] Starting permission request...');
    
    // First check if notifications are supported
    if (!('Notification' in window)) {
      toast({
        title: "Non supporté",
        description: "Les notifications ne sont pas supportées sur votre navigateur",
        variant: "destructive",
        duration: 5000,
      });
      return false;
    }

    try {
      // Get initialized OneSignal instance
      const OneSignal = getOneSignal();
      
      // Get current user and profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get interpreter profile data
      const { data: profile, error: profileError } = await supabase
        .from('interpreter_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Could not fetch interpreter profile');
      }

      // Set the external user ID for targeting
      await setExternalUserId(user.id);
      
      // Show the OneSignal prompt
      await OneSignal.showSlidedownPrompt();
      
      // Get OneSignal player ID
      const playerId = await getPlayerId();
      if (!playerId) {
        throw new Error('Could not get OneSignal player ID');
      }

      // Set interpreter tags
      await setInterpreterTags({
        id: user.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        languages: profile.languages.map((lang: string) => {
          const [source, target] = lang.split('→');
          return { source, target };
        })
      });

      // Store subscription in database
      const { error: subscriptionError } = await supabase
        .from('onesignal_subscriptions')
        .upsert({
          interpreter_id: user.id,
          player_id: playerId,
          platform: 'web',
          status: 'active',
          user_agent: navigator.userAgent
        });

      if (subscriptionError) {
        console.error('[OneSignal] Error storing subscription:', subscriptionError);
      }
      
      // Play notification sound on success
      await playNotificationSound('scheduled');
      
      toast({
        title: "Notifications activées",
        description: "Vous recevrez désormais les notifications pour les nouvelles missions",
        duration: 3000,
      });
      
      return true;
    } catch (error) {
      console.error('[OneSignal] Error:', error);
      return false;
    }
  } catch (error: any) {
    console.error('[OneSignal] Error:', error);
    toast({
      title: "Erreur",
      description: error.message || "Une erreur est survenue lors de l'activation des notifications",
      variant: "destructive",
      duration: 5000,
    });
    return false;
  }
};

// Check if notifications are currently enabled
export const isNotificationsEnabled = async (): Promise<boolean> => {
  try {
    const OneSignal = getOneSignal();
    return await OneSignal.isPushNotificationsEnabled();
  } catch (error) {
    console.error('[OneSignal] Status check error:', error);
    return false;
  }
};

// Unregister device from notifications
export const unregisterDevice = async (): Promise<boolean> => {
  try {
    const OneSignal = getOneSignal();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Disable OneSignal subscription
    await OneSignal.setSubscription(false);
    
    // Update subscription status in database
    const playerId = await getPlayerId();
    if (playerId) {
      const { error: updateError } = await supabase
        .from('onesignal_subscriptions')
        .update({ status: 'unsubscribed' })
        .match({ interpreter_id: user.id, player_id: playerId });

      if (updateError) {
        console.error('[OneSignal] Error updating subscription status:', updateError);
      }
    }
    
    toast({
      title: "Notifications désactivées",
      description: "Vous ne recevrez plus de notifications",
      duration: 3000,
    });
    
    return true;
  } catch (error) {
    console.error('[OneSignal] Unregister error:', error);
    return false;
  }
};

