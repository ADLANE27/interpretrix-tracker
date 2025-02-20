
import { supabase } from "@/integrations/supabase/client";

export const unregisterPushNotifications = async () => {
  try {
    console.log('[pushNotifications] Starting unregistration process');
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Remove subscription from database first
    console.log('[pushNotifications] Removing subscription from database');
    const { error: deleteError } = await supabase
      .from('user_push_subscriptions')
      .delete()
      .eq('user_id', session.user.id);

    if (deleteError) {
      throw deleteError;
    }

    // Then unsubscribe from push manager
    console.log('[pushNotifications] Unsubscribing from push manager');
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('[pushNotifications] Successfully unsubscribed');
    }

    return {
      success: true,
      message: 'Notifications push désactivées avec succès'
    };

  } catch (error) {
    console.error('[pushNotifications] Unregister error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Impossible de désactiver les notifications push'
    };
  }
};
