
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { playNotificationSound } from "@/utils/notificationSounds";
import { getOneSignal, getPlayerId, setExternalUserId } from './oneSignalSetup';

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
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Set the external user ID for targeting
      await setExternalUserId(user.id);
      
      // Show the OneSignal prompt
      await OneSignal.showSlidedownPrompt();
      
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
    await OneSignal.setSubscription(false);
    
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

