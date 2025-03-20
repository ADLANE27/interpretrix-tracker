
import { supabase } from '@/integrations/supabase/client';
import { checkConnection } from './utils/fileUtils';

export const useMentions = (
  channelId: string,
  currentUserId: string | null
) => {
  const markMentionsAsRead = async () => {
    if (!currentUserId || !channelId) return;

    if (!checkConnection()) {
      console.error('[Chat] Cannot mark mentions as read: No internet connection');
      return;
    }

    try {
      const { error } = await supabase
        .from('message_mentions')
        .update({ status: 'read' })
        .eq('mentioned_user_id', currentUserId)
        .eq('channel_id', channelId)
        .eq('status', 'unread');

      if (error) {
        console.error('[Chat] Error marking mentions as read:', error);
      }
    } catch (error) {
      console.error('[Chat] Error marking mentions as read:', error);
    }
  };

  return { markMentionsAsRead };
};
