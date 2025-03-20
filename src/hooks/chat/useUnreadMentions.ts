
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useUnreadMentions(channelId: string) {
  const [unreadMentions, setUnreadMentions] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUnreadMentions = useCallback(async () => {
    console.log(`Fetching unread mentions for channel: ${channelId}`);
    setIsLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.error('No authenticated user found when fetching unread mentions');
        setIsLoading(false);
        return;
      }

      const userId = user.user.id;
      console.log(`Fetching unread mentions for user: ${userId} in channel: ${channelId}`);

      const { data, error, count } = await supabase
        .from('message_mentions')
        .select('*', { count: 'exact' })
        .eq('mentioned_user_id', userId)
        .eq('channel_id', channelId)
        .eq('status', 'unread');

      if (error) {
        console.error('Error fetching unread mentions:', error);
        throw error;
      }

      console.log(`Found ${count} unread mentions for user ${userId} in channel ${channelId}`);
      setUnreadMentions(count || 0);
    } catch (error) {
      console.error('Error in fetchUnreadMentions:', error);
      setUnreadMentions(0);
    } finally {
      setIsLoading(false);
    }
  }, [channelId]);

  const markMentionsAsRead = useCallback(async () => {
    console.log(`Marking mentions as read for channel: ${channelId}`);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.error('No authenticated user found when marking mentions as read');
        return;
      }

      const userId = user.user.id;
      console.log(`Marking mentions as read for user: ${userId} in channel: ${channelId}`);

      const { error } = await supabase
        .from('message_mentions')
        .update({ status: 'read' })
        .eq('mentioned_user_id', userId)
        .eq('channel_id', channelId)
        .eq('status', 'unread');

      if (error) {
        console.error('Error marking mentions as read:', error);
        throw error;
      }

      console.log(`Successfully marked mentions as read for user ${userId} in channel ${channelId}`);
      setUnreadMentions(0);
    } catch (error) {
      console.error('Error in markMentionsAsRead:', error);
    }
  }, [channelId]);

  // Subscribe to new mentions
  useEffect(() => {
    console.log(`Setting up subscription for mentions in channel: ${channelId}`);
    
    const fetchInitialUnreadMentions = async () => {
      await fetchUnreadMentions();
    };
    
    fetchInitialUnreadMentions();

    const subscription = supabase
      .channel(`mentions:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_mentions',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          console.log('Received mention subscription event:', payload);
          // Refresh unread mentions count when there are changes
          fetchUnreadMentions();
        }
      )
      .subscribe((status) => {
        console.log(`Mention subscription status for channel ${channelId}:`, status);
      });

    return () => {
      console.log(`Cleaning up mention subscription for channel: ${channelId}`);
      subscription.unsubscribe();
    };
  }, [channelId, fetchUnreadMentions]);

  return {
    unreadMentions,
    isLoading,
    markMentionsAsRead,
    refreshUnreadMentions: fetchUnreadMentions
  };
}
