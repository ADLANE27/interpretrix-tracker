
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { eventEmitter, EVENT_UNREAD_MENTIONS_UPDATED } from "@/lib/events";

export const useMessageVisibility = (channelId: string) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const markingInProgress = useRef<boolean>(false);

  const markChannelMentionsAsRead = useCallback(async () => {
    if (markingInProgress.current) return;
    markingInProgress.current = true;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        markingInProgress.current = false;
        return;
      }

      console.log('[MessageVisibility] Delaying mention read status update...');
      
      // Extend the delay to 10 seconds to ensure the notification badge is visible long enough
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Fetch current unread mentions count before we update
      const { data: mentionsBeforeUpdate, error: countError } = await supabase
        .from('message_mentions')
        .select('id')
        .eq('channel_id', channelId)
        .eq('mentioned_user_id', user.id)
        .eq('status', 'unread');

      if (countError) {
        console.error('[MessageVisibility] Error fetching unread mentions count:', countError);
        markingInProgress.current = false;
        return;
      }

      const unreadCountBefore = mentionsBeforeUpdate?.length || 0;

      // Update channel_members last_read_at
      await supabase
        .from('channel_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('channel_id', channelId)
        .eq('user_id', user.id);

      // Mark all unread mentions in this channel as read
      const { data: mentions, error: mentionsError } = await supabase
        .from('message_mentions')
        .select('id')
        .eq('channel_id', channelId)
        .eq('mentioned_user_id', user.id)
        .eq('status', 'unread');

      if (mentionsError) {
        console.error('[MessageVisibility] Error fetching unread mentions:', mentionsError);
        markingInProgress.current = false;
        return;
      }

      if (mentions && mentions.length > 0) {
        const { error: updateError } = await supabase
          .from('message_mentions')
          .update({ status: 'read' })
          .eq('channel_id', channelId)
          .eq('mentioned_user_id', user.id)
          .eq('status', 'unread');

        if (updateError) {
          console.error('[MessageVisibility] Error marking mentions as read:', updateError);
        } else {
          console.log('[MessageVisibility] Marked all mentions as read in channel:', channelId);
          
          // Get all unread mentions across all channels after the update
          const { data: remainingMentions } = await supabase
            .from('message_mentions')
            .select('id')
            .eq('mentioned_user_id', user.id)
            .eq('status', 'unread');
            
          // Emit the updated count to update the UI
          const remainingCount = remainingMentions?.length || 0;
          eventEmitter.emit(EVENT_UNREAD_MENTIONS_UPDATED, remainingCount);
          
          console.log(`[MessageVisibility] Updated unread mentions count: ${unreadCountBefore} → ${remainingCount}`);
        }
      }
    } catch (error) {
      console.error('[MessageVisibility] Error in markChannelMentionsAsRead:', error);
    } finally {
      markingInProgress.current = false;
    }
  }, [channelId]);

  const handleMessageVisible = async (messageId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Increase delay for individual message mentions as well
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Get current mention count before update
      const { data: allMentionsBefore } = await supabase
        .from('message_mentions')
        .select('id')
        .eq('mentioned_user_id', user.id)
        .eq('status', 'unread');
      
      const countBefore = allMentionsBefore?.length || 0;

      // Mark individual message mention as read
      await supabase
        .from('message_mentions')
        .update({ status: 'read' })
        .eq('message_id', messageId)
        .eq('mentioned_user_id', user.id)
        .eq('status', 'unread');

      console.log('[MessageVisibility] Marked message as read:', messageId);
      
      // Get updated mention count
      const { data: allMentionsAfter } = await supabase
        .from('message_mentions')
        .select('id')
        .eq('mentioned_user_id', user.id)
        .eq('status', 'unread');
      
      // Emit event with updated count to refresh badge
      const countAfter = allMentionsAfter?.length || 0;
      eventEmitter.emit(EVENT_UNREAD_MENTIONS_UPDATED, countAfter);
      
      console.log(`[MessageVisibility] Updated unread mentions count: ${countBefore} → ${countAfter}`);
    } catch (error) {
      console.error('[MessageVisibility] Error marking message as read:', error);
    }
  };

  useEffect(() => {
    if (!channelId) return;

    // Mark all mentions as read when entering the channel - with delay
    markChannelMentionsAsRead();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute('data-message-id');
            if (messageId) {
              handleMessageVisible(messageId);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [channelId, markChannelMentionsAsRead]);

  const observeMessage = (element: HTMLElement | null) => {
    if (element && observerRef.current) {
      observerRef.current.observe(element);
    }
  };

  return { observeMessage };
};
