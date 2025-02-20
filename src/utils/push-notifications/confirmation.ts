
import { supabase } from "@/integrations/supabase/client";

export const confirmNotificationDelivery = async (notificationId: string) => {
  try {
    const { error } = await supabase
      .from('notification_queue')
      .update({
        status: 'delivered',
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('[pushNotifications] Confirmation error:', error);
    return { success: false, error };
  }
};
