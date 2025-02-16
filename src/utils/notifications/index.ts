
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { playNotificationSound } from "@/utils/notificationSounds";
import { getPlayerId, getSubscriptionStatus } from './oneSignalSetup';
import { showCustomPermissionMessage } from './permissionHandling';

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
    
    // Check if already subscribed
    const isSubscribed = await getSubscriptionStatus();
    console.log('[OneSignal] Current subscription status:', isSubscribed);

    if (isSubscribed) {
      const playerId = await getPlayerId();
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

    // Show the OneSignal prompt
    await window.OneSignal.showSlidedownPrompt();
    
    // Wait for subscription status change
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const currentStatus = await getSubscriptionStatus();
      if (currentStatus) {
        const playerId = await getPlayerId();
        if (playerId) {
          const registered = await registerDevice(playerId);
          if (registered) {
            // Play notification sound
            await playNotificationSound('scheduled');
            
            toast({
              title: "Notifications activées",
              description: "Vous recevrez désormais les notifications pour les nouvelles missions",
              duration: 3000,
            });
            
            return true;
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('[OneSignal] Subscription timeout');
    return false;
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
    const isSubscribed = await getSubscriptionStatus();
    if (!isSubscribed) {
      return false;
    }

    const playerId = await getPlayerId();
    if (!playerId) {
      return false;
    }

    // Verify subscription in database
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    const { data: subscription } = await supabase
      .from('onesignal_subscriptions')
      .select('status')
      .eq('interpreter_id', user.id)
      .eq('player_id', playerId)
      .single();

    return subscription?.status === 'active';
  } catch (error) {
    console.error('[OneSignal] Status check error:', error);
    return false;
  }
};

// Register device with our backend
const registerDevice = async (playerId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[OneSignal] No authenticated user');
      return false;
    }

    console.log('[OneSignal] Registering device for user:', user.id);

    // Upsert subscription record
    const { error } = await supabase
      .from('onesignal_subscriptions')
      .upsert({
        interpreter_id: user.id,
        player_id: playerId,
        platform: 'web',
        status: 'active',
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('[OneSignal] Error registering device:', error);
      return false;
    }

    // Set interpreter ID tag in OneSignal
    await window.OneSignal.sendTag('interpreter_id', user.id);
    console.log('[OneSignal] Device registered successfully');
    return true;
  } catch (error) {
    console.error('[OneSignal] Error in registerDevice:', error);
    return false;
  }
};

// Unregister device from notifications
export const unregisterDevice = async (): Promise<boolean> => {
  try {
    const playerId = await getPlayerId();
    if (!playerId) {
      console.error('[OneSignal] No player ID found');
      return false;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[OneSignal] No authenticated user');
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
