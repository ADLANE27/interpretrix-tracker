import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { eventEmitter, EVENT_UNREAD_MENTIONS_UPDATED } from "@/lib/events";

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
  const [userId, setUserId] = useState<string | null>(null);

  const fetchUnreadMentions = useCallback(async () => {
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

      setUserId(user.id);
      console.log('[Mentions Debug] Fetching mentions for user:', user.id);
      
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

      // Emit the event with the total count to update UI components
      eventEmitter.emit(EVENT_UNREAD_MENTIONS_UPDATED, mentionsWithNames.length);
    } catch (error) {
      console.error('[Mentions Debug] Error in fetchUnreadMentions:', error);
      setUnreadMentions([]);
      setUnreadDirectMessages(0);
      setTotalUnreadCount(0);
    }
  }, []);

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
      
      // Update the local state immediately instead of fetching again
      setUnreadMentions(prev => {
        const filtered = prev.filter(mention => mention.mention_id !== mentionId);
        
        // Update the total count
        const newTotal = filtered.length + unreadDirectMessages;
        setTotalUnreadCount(newTotal);
        
        // Emit the event with the new count
        eventEmitter.emit(EVENT_UNREAD_MENTIONS_UPDATED, filtered.length);
        
        return filtered;
      });
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
      
      // Update the local state immediately instead of fetching again
      setUnreadMentions(prev => {
        const filtered = prev.filter(mention => mention.mention_id !== mentionId);
        
        // Update the total count
        const newTotal = filtered.length + unreadDirectMessages;
        setTotalUnreadCount(newTotal);
        
        // Emit the event with the new count
        eventEmitter.emit(EVENT_UNREAD_MENTIONS_UPDATED, filtered.length);
        
        return filtered;
      });
    } catch (error) {
      console.error('[Mentions Debug] Error deleting mention:', error);
    }
  };

  // Setup global subscriptions
  useEffect(() => {
    // Initial fetch
    fetchUnreadMentions();

    // Setup realtime subscription for instant updates
    const channel = supabase.channel('global-mentions-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_mentions' },
        (payload) => {
          console.log('[Mentions Debug] Message mentions table changed:', payload);
          
          // If this is a new mention for the current user, update immediately
          if (payload.eventType === 'INSERT' && 
              payload.new && 
              payload.new.mentioned_user_id === userId && 
              payload.new.status === 'unread') {
            console.log('[Mentions Debug] New mention detected for current user');
            fetchUnreadMentions();
          }
          
          // If this is a status update for an existing mention (read/deleted)
          if (payload.eventType === 'UPDATE' && 
              payload.old && 
              payload.new && 
              payload.old.status === 'unread' && 
              payload.new.status !== 'unread' &&
              payload.new.mentioned_user_id === userId) {
            console.log('[Mentions Debug] Mention status changed to:', payload.new.status);
            
            // Update local state immediately
            setUnreadMentions(prev => {
              const filtered = prev.filter(mention => mention.mention_id !== payload.new.id);
              setTotalUnreadCount(filtered.length + unreadDirectMessages);
              eventEmitter.emit(EVENT_UNREAD_MENTIONS_UPDATED, filtered.length);
              return filtered;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => {
          console.log('[Messages Debug] New message received');
          fetchUnreadMentions();
        }
      )
      .subscribe();

    // Create interval to periodically refresh mentions
    const intervalId = setInterval(() => {
      console.log('[Mentions Debug] Refreshing mentions on interval');
      fetchUnreadMentions();
    }, 30000);

    // Auth subscription
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUnreadMentions([]);
        setUnreadDirectMessages(0);
        setTotalUnreadCount(0);
        setUserId(null);
      } else if (event === 'SIGNED_IN') {
        fetchUnreadMentions();
      }
    });

    // Cleanup function
    return () => {
      console.log('[Mentions Debug] Cleaning up subscriptions');
      clearInterval(intervalId);
      authSubscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [fetchUnreadMentions, userId, unreadDirectMessages]);

  return { 
    unreadMentions, 
    totalUnreadCount,
    unreadDirectMessages,
    markMentionAsRead,
    deleteMention,
    refreshMentions: fetchUnreadMentions 
  };
};
