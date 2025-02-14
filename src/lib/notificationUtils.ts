
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { messaging } from "./firebase";
import { getToken } from "firebase/messaging";

export const subscribeToPushNotifications = async (interpreterId: string) => {
  try {
    // Request permission and get token
    const token = await getToken(messaging, {
      vapidKey: "BHV5A6OLwWqL4TyjAIgewXA3qeABV0C1yEvKpBIkQT3uIQXv8YJrJtzBljQ1qFzXs1BpbqKX7XscWF9RpFYCtFU"
    });

    if (!token) {
      throw new Error("No registration token available");
    }

    // Save subscription to database
    const { error: saveError } = await supabase
      .from('push_subscriptions')
      .upsert({
        interpreter_id: interpreterId,
        fcm_token: token,
        platform: 'web',
        status: 'active'
      }, {
        onConflict: 'interpreter_id',
      });

    if (saveError) {
      console.error('[Firebase] Error saving subscription:', saveError);
      throw saveError;
    }

    // Send test notification
    const { error: testError } = await supabase.functions.invoke('send-test-notification', {
      body: { interpreterId }
    });

    if (testError) throw testError;

    return true;
  } catch (error) {
    console.error('[Firebase] Error subscribing to notifications:', error);
    throw error;
  }
};

export const unsubscribeFromPushNotifications = async (interpreterId: string) => {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('interpreter_id', interpreterId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('[Firebase] Error unsubscribing from notifications:', error);
    throw error;
  }
};

