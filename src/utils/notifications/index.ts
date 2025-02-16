
import { supabase } from "@/integrations/supabase/client";

export async function sendNotification(userId: string, title: string, body: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    await supabase.from('notification_history').insert({
      recipient_id: userId,
      notification_type: 'mission',
      content: {
        title,
        body,
        sender_id: user.id
      }
    });

    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}
