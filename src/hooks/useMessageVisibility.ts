
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";

export const useMessageVisibility = (channelId: string) => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const markChannelMentionsAsRead = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[MessageVisibility] Marking mentions as read in channel:', channelId);

      // Update channel_members last_read_at
      await supabase
        .from('channel_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('channel_id', channelId)
        .eq('user_id', user.id);

      // Mark all unread mentions in this channel as read, only for current user
      const { data: mentions, error: mentionsError } = await supabase
        .from('message_mentions')
        .select('id')
        .eq('channel_id', channelId)
        .eq('mentioned_user_id', user.id)
        .eq('status', 'unread');

      if (mentionsError) {
        console.error('[MessageVisibility] Error fetching unread mentions:', mentionsError);
        return;
      }

      if (mentions && mentions.length > 0) {
        console.log('[MessageVisibility] Found', mentions.length, 'mentions to mark as read');
        
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
        }
      }
    } catch (error) {
      console.error('[MessageVisibility] Error in markChannelMentionsAsRead:', error);
    }
  }, [channelId]);

  const handleMessageVisible = async (messageId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark individual message mention as read, only for current user
      await supabase
        .from('message_mentions')
        .update({ status: 'read' })
        .eq('message_id', messageId)
        .eq('mentioned_user_id', user.id)
        .eq('status', 'unread');

      console.log('[MessageVisibility] Marked message as read:', messageId);
    } catch (error) {
      console.error('[MessageVisibility] Error marking message as read:', error);
    }
  };

  useEffect(() => {
    if (!channelId) return;

    // Mark all mentions as read when entering the channel
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
