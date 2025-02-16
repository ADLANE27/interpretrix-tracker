import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { playNotificationSound } from "@/utils/notificationSounds";
import { waitForOneSignal } from './initialization';
import { registerDevice } from './deviceRegistration';
import { showCustomPermissionMessage } from './permissionHandling';

// Request notification permissions and register device
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    console.log('[OneSignal] Starting permission request...');
    
    // First check if notifications are supported
    if (!areNotificationsSupported()) {
      toast({
        title: "Non supporté",
        description: "Les notifications ne sont pas supportées sur votre navigateur",
        variant: "destructive",
        duration: 5000,
      });
      return false;
    }
    
    // Wait for OneSignal initialization with retries
    const initialized = await waitForOneSignal(10000, 3);
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

    // Check if notifications are denied
    if (Notification.permission === "denied") {
      console.log('[OneSignal] Notifications are denied');
      showCustomPermissionMessage();
      return false;
    }

    // If not subscribed, show the prompt
    console.log('[OneSignal] Showing subscription prompt');
    await window.OneSignal.showSlidedownPrompt();
    
    // Wait for subscription status change with increased timeout
    let attempts = 0;
    const maxAttempts = 15; // Increased from 10 to 15
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
          // Test notification sound
          await playNotificationSound('scheduled');
          
          // Show success message
          toast({
            title: "Notifications activées",
            description: "Vous recevrez désormais les notifications pour les nouvelles missions",
            duration: 3000,
          });
          
          return true;
        }
      }
      
      // Increased wait time between checks
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    console.log('[OneSignal] Subscription attempt timed out');
    throw new Error('Délai d\'attente dépassé pour l\'activation des notifications');
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
    // Wait for OneSignal initialization
    const initialized = await waitForOneSignal();
    if (!initialized) {
      console.log('[OneSignal] Not initialized');
      return false;
    }

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
    // Wait for OneSignal initialization
    const initialized = await waitForOneSignal();
    if (!initialized) {
      console.log('[OneSignal] Not initialized');
      return false;
    }

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

// Helper function to check if notifications are supported
function areNotificationsSupported() {
  return 'Notification' in window && Notification.permission !== 'denied';
}
