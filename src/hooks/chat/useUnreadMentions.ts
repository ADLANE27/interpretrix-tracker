
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
  const [unreadDirectMessages, setUnreadDirectMessages] = useState<number>(0);
  const [totalUnreadCount, setTotalUnreadCount] = useState<number>(0);

  const fetchUnreadMentions = async () => {
    console.log('[Mentions Debug] Fetching unread mentions...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[Mentions Debug] No authenticated user found');
        setUnreadMentions([]);
        setUnreadDirectMessages(0);
        setTotalUnreadCount(0);
        return;
      }

      console.log('[Mentions Debug] Fetching mentions for user:', user.id);
      
      // Clear existing state before fetching new data
      setUnreadMentions([]);
      setUnreadDirectMessages(0);
      setTotalUnreadCount(0);

      // Fetch unread mentions
      const { data: mentionsData, error: mentionsError } = await supabase
        .from('message_mentions')
        .select(`
          id,
          message_id,
          channel_id,
          chat_messages (
            content,
            sender_id
          ),
          created_at
        `)
        .eq('mentioned_user_id', user.id)
        .eq('status', 'unread')
        .order('created_at', { ascending: false });

      if (mentionsError) {
        console.error('[Mentions Debug] Error fetching unread mentions:', mentionsError);
        return;
      }

      console.log('[Mentions Debug] Raw mentions data:', mentionsData);

      // Fetch unread direct messages count
      const { data: directChannels, error: channelsError } = await supabase
        .from('chat_channels')
        .select('id')
        .eq('channel_type', 'direct');

      if (channelsError) {
        console.error('[DM Debug] Error fetching direct channels:', channelsError);
        return;
      }

      const channelIds = directChannels.map(channel => channel.id);
      
      // Get the last read timestamp for each channel
      const { data: memberData } = await supabase
        .from('channel_members')
        .select('channel_id, last_read_at')
        .eq('user_id', user.id)
        .in('channel_id', channelIds);

      const lastReadMap = new Map(
        memberData?.map(member => [member.channel_id, member.last_read_at]) || []
      );

      // Count unread messages in direct channels
      let unreadDMCount = 0;
      for (const channelId of channelIds) {
        const lastRead = lastReadMap.get(channelId);
        if (!lastRead) continue;

        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', channelId)
          .gt('created_at', lastRead)
          .neq('sender_id', user.id);

        if (count) unreadDMCount += count;
      }

      // Process mentions with sender names
      const mentionsWithNames = await Promise.all(
        (mentionsData as UnreadMentionResponse[] || [])
          .filter(mention => mention.chat_messages) // Only include mentions with existing messages
          .map(async (mention) => {
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

      console.log('[Mentions Debug] Processed mentions:', mentionsWithNames);
      
      setUnreadMentions(mentionsWithNames);
      setUnreadDirectMessages(unreadDMCount);
      setTotalUnreadCount(mentionsWithNames.length + unreadDMCount);

      console.log('[Mentions Debug] Updated counts:', {
        mentions: mentionsWithNames.length,
        dms: unreadDMCount,
        total: mentionsWithNames.length + unreadDMCount
      });
    } catch (error) {
      console.error('[Mentions Debug] Error in fetchUnreadMentions:', error);
      setUnreadMentions([]);
      setUnreadDirectMessages(0);
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
      
      // Immediately update local state instead of fetching again
      setUnreadMentions(prev => prev.filter(mention => mention.mention_id !== mentionId));
      setTotalUnreadCount(prev => prev - 1);
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
      
      // Immediately update local state instead of fetching again
      setUnreadMentions(prev => prev.filter(mention => mention.mention_id !== mentionId));
      setTotalUnreadCount(prev => prev - 1);
    } catch (error) {
      console.error('[Mentions Debug] Error deleting mention:', error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchUnreadMentions();

    // Auth subscription
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUnreadMentions([]);
        setUnreadDirectMessages(0);
        setTotalUnreadCount(0);
      } else if (event === 'SIGNED_IN') {
        fetchUnreadMentions();
      }
    });

    // Create a single channel for all subscriptions with more specific filters
    const channel = supabase.channel('mentions-and-messages-realtime')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'message_mentions' 
        },
        (payload) => {
          console.log('[Mentions Debug] Message mentions table changed:', payload);
          
          // For optimistic updates, handle specific mention changes directly
          if (payload.eventType === 'INSERT') {
            fetchUnreadMentions(); // Fetch all on insert to get properly formatted data
          } else if (payload.eventType === 'UPDATE') {
            // If a mention was marked as read or deleted by another client
            fetchUnreadMentions(); // Refresh to keep consistent state
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages' 
        },
        () => {
          console.log('[Messages Debug] New message received');
          fetchUnreadMentions();
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'channel_members' 
        },
        (payload) => {
          console.log('[Messages Debug] Channel membership updated:', payload);
          // Only refetch if last_read_at was updated
          if (payload.new && payload.old && 
              payload.new.last_read_at !== payload.old.last_read_at) {
            fetchUnreadMentions();
          }
        }
      )
      .subscribe((status) => {
        console.log('[Mentions Debug] Subscription status:', status);
      });

    // Cleanup function
    return () => {
      console.log('[Mentions Debug] Cleaning up subscriptions');
      authSubscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  return { 
    unreadMentions, 
    totalUnreadCount,
    unreadDirectMessages,
    markMentionAsRead,
    deleteMention,
    refreshMentions: fetchUnreadMentions 
  };
};
