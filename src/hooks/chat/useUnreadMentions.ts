
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UnreadMention {
  mention_id: string;
  message_id: string;
  channel_id: string;
  message_content: string;
  mentioning_user_name: string;
  created_at: Date;
}

interface UnreadMentionResponse {
  id: string;
  message_id: string;
  channel_id: string;
  chat_messages: {
    content: string;
    sender_id: string;
  };
  created_at: string;
}

export const useUnreadMentions = () => {
  const [unreadMentions, setUnreadMentions] = useState<UnreadMention[]>([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState<number>(0);

  const fetchUnreadMentions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[Mentions Debug] No authenticated user found');
        setUnreadMentions([]);
        setTotalUnreadCount(0);
        return;
      }

      console.log('[Mentions Debug] Fetching unread mentions for user:', user.id);
      
      const { data, error } = await supabase
        .from('message_mentions')
        .select(`
          id,
          message_id,
          channel_id,
          chat_messages:chat_messages (
            content,
            sender_id
          ),
          created_at
        `)
        .eq('mentioned_user_id', user.id)
        .eq('status', 'unread')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Mentions Debug] Error fetching unread mentions:', error);
        return;
      }

      console.log('[Mentions Debug] Unread mentions data:', data);

      if (!data) {
        setUnreadMentions([]);
        setTotalUnreadCount(0);
        return;
      }

      // Get sender names for each mention
      const mentionsWithNames = await Promise.all(
        (data as UnreadMentionResponse[]).map(async (mention) => {
          const { data: senderData } = await supabase
            .rpc('get_message_sender_details', {
              sender_id: mention.chat_messages.sender_id
            });

          return {
            mention_id: mention.id,
            message_id: mention.message_id,
            channel_id: mention.channel_id,
            message_content: mention.chat_messages.content,
            mentioning_user_name: senderData?.[0]?.name || 'Unknown User',
            created_at: new Date(mention.created_at)
          };
        })
      );

      setUnreadMentions(mentionsWithNames);
      setTotalUnreadCount(mentionsWithNames.length);
    } catch (error) {
      console.error('[Mentions Debug] Error in fetchUnreadMentions:', error);
      setUnreadMentions([]);
      setTotalUnreadCount(0);
    }
  };

  const markMentionAsRead = async (mentionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[Mentions Debug] Marking mention as read:', mentionId);
      const { error } = await supabase
        .from('message_mentions')
        .update({ status: 'read' })
        .eq('id', mentionId)
        .eq('mentioned_user_id', user.id);

      if (error) {
        console.error('[Mentions Debug] Error marking mention as read:', error);
        throw error;
      }
      
      console.log('[Mentions Debug] Successfully marked mention as read');
      await fetchUnreadMentions();
    } catch (error) {
      console.error('[Mentions Debug] Error marking mention as read:', error);
    }
  };

  const deleteMention = async (mentionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[Mentions Debug] Deleting mention:', mentionId);
      const { error } = await supabase
        .from('message_mentions')
        .update({ status: 'deleted' })
        .eq('id', mentionId)
        .eq('mentioned_user_id', user.id);

      if (error) {
        console.error('[Mentions Debug] Error deleting mention:', error);
        throw error;
      }

      console.log('[Mentions Debug] Successfully deleted mention');
      await fetchUnreadMentions();
    } catch (error) {
      console.error('[Mentions Debug] Error deleting mention:', error);
    }
  };

  useEffect(() => {
    fetchUnreadMentions();

    // Subscribe to auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUnreadMentions([]);
        setTotalUnreadCount(0);
      } else if (event === 'SIGNED_IN') {
        fetchUnreadMentions();
      }
    });

    // Subscribe to mentions changes
    const channel = supabase.channel('mentions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_mentions' },
        () => {
          console.log('[Mentions Debug] Message mentions table changed');
          fetchUnreadMentions();
        }
      )
      .subscribe();

    return () => {
      authSubscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  return { 
    unreadMentions, 
    totalUnreadCount, 
    markMentionAsRead,
    deleteMention,
    refreshMentions: fetchUnreadMentions 
  };
};

