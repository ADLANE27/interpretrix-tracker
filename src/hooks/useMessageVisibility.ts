
import { useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";

export const useMessageVisibility = (channelId: string) => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleMessageVisible = async (messageId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update channel_members last_read_at
      await supabase
        .from('channel_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('channel_id', channelId)
        .eq('user_id', user.id);

      // Mark mentions as read
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
  }, [channelId]);

  const observeMessage = (element: HTMLElement | null) => {
    if (element && observerRef.current) {
      observerRef.current.observe(element);
    }
  };

  return { observeMessage };
};
