
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUnreadMentions = () => {
  const [unreadMentions, setUnreadMentions] = useState<{ [key: string]: number }>({});

  const fetchUnreadMentions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[Mentions Debug] No authenticated user found');
        return;
      }

      console.log('[Mentions Debug] Fetching unread mentions for user:', user.id);
      
      const { data, error } = await supabase
        .from('message_mentions')
        .select('*')
        .eq('mentioned_user_id', user.id)
        .eq('status', 'unread');

      if (error) {
        console.error('[Mentions Debug] Error fetching unread mentions:', error);
        return;
      }

      console.log('[Mentions Debug] Unread mentions data:', data);

      // Count mentions per channel
      const counts: { [key: string]: number } = {};
      data.forEach(mention => {
        counts[mention.channel_id] = (counts[mention.channel_id] || 0) + 1;
      });

      console.log('[Mentions Debug] Processed unread mentions counts:', counts);
      setUnreadMentions(counts);
    } catch (error) {
      console.error('[Mentions Debug] Error in fetchUnreadMentions:', error);
    }
  };

  useEffect(() => {
    fetchUnreadMentions();

    const channel = supabase.channel('mentions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_mentions' },
        () => {
          console.log('[Mentions Debug] Message mentions table changed, refreshing counts');
          fetchUnreadMentions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { unreadMentions };
};
