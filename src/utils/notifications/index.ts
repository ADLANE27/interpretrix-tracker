import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { playNotificationSound } from "@/utils/notificationSounds";
import { getOneSignal, registerDevice } from './oneSignalSetup';

// Request notification permissions and register device
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
      // Get current user and profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: profile, error: profileError } = await supabase
        .from('interpreter_profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Could not fetch user profile');
      }

      // Get initialized OneSignal instance
      const OneSignal = getOneSignal();
      
      // Show native prompt first to get permission
      console.log('[OneSignal] Requesting notification permission...');
      const permission = await OneSignal.showNativePrompt();
      
      if (permission === 'granted') {
        // Register device with OneSignal
        await registerDevice(user.id, {
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email
        });
        
        // Play notification sound on success
        await playNotificationSound('scheduled');
        
        toast({
          title: "Notifications activées",
          description: "Vous recevrez désormais les notifications pour les nouvelles missions",
          duration: 3000,
        });
        
        return true;
      } else {
        throw new Error('Permission not granted');
      }
    } catch (error) {
      console.error('[OneSignal] Error:', error);
      throw error;
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get player ID
    const playerId = await getOneSignal().getUserId();
    if (!playerId) {
      throw new Error('No OneSignal player ID found');
    }

    // Update subscription status in database
    const { error } = await supabase
      .from('onesignal_subscriptions')
      .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
      .eq('interpreter_id', user.id)
      .eq('player_id', playerId);

    if (error) throw error;

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
