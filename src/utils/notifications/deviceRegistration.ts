
import { supabase } from "@/integrations/supabase/client";
import { OneSignalSubscription } from './types';

export const registerDevice = async (playerId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[OneSignal] No authenticated user');
      return false;
    }

    console.log('[OneSignal] Registering device for user:', user.id);

    const subscription: OneSignalSubscription = {
      interpreter_id: user.id,
      player_id: playerId,
      platform: 'web',
      status: 'active',
      user_agent: navigator.userAgent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Register subscription in database
    const { error } = await supabase
      .from('onesignal_subscriptions')
      .upsert(subscription);

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
