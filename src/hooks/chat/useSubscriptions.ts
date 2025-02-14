
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';

const handleVisibilityChange = (channel: RealtimeChannel | null) => {
  if (!channel) return;
  
  if (document.visibilityState === 'visible') {
    channel.subscribe();
  } else {
    channel.unsubscribe();
  }
};

export const useSubscriptions = (
  channelId: string,
  currentUserId: string | null,
  retryCount: number,
  setRetryCount: (count: number) => void,
  fetchMessages: () => Promise<void>
) => {
  const { toast } = useToast();
  const errorCountRef = useRef(0);
  const initialDelayRef = useRef<NodeJS.Timeout>();
  const isSubscribingRef = useRef(false);
  const messageChannelRef = useRef<RealtimeChannel | null>(null);
  const mentionChannelRef = useRef<RealtimeChannel | null>(null);
  const visibilityHandlersRef = useRef<(() => void)[]>([]);

  const handleSubscriptionError = () => {
    errorCountRef.current += 1;
    
    if (errorCountRef.current >= 3) {
      errorCountRef.current = 0;
      toast({
        title: "Problème de connexion",
        description: "Tentative de reconnexion en cours...",
        variant: "destructive",
      });
    }
    setRetryCount(retryCount + 1);
  };

  const cleanupVisibilityHandlers = () => {
    visibilityHandlersRef.current.forEach(handler => {
      document.removeEventListener('visibilitychange', handler);
    });
    visibilityHandlersRef.current = [];
  };

  const subscribeToMessages = () => {
    if (isSubscribingRef.current || messageChannelRef.current) {
      console.log('[Chat] Messages already subscribed or subscribing, skipping.');
      return messageChannelRef.current;
    }

    isSubscribingRef.current = true;
    console.log('[Chat] Setting up real-time subscription for channel:', channelId);
    
    messageChannelRef.current = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          console.log('[Chat] Received real-time update:', payload);
          await fetchMessages();
          
          if (payload.eventType === 'INSERT' && payload.new.sender_id !== currentUserId) {
            toast({
              title: "Nouveau message",
              description: "Un nouveau message a été reçu",
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Chat] Messages subscription status:', status);
        if (status === 'SUBSCRIBED') {
          isSubscribingRef.current = false;
          errorCountRef.current = 0;
        }
        if (status === 'CHANNEL_ERROR') {
          isSubscribingRef.current = false;
          handleSubscriptionError();
        }
      });

    const messageVisibilityHandler = () => handleVisibilityChange(messageChannelRef.current);
    document.addEventListener('visibilitychange', messageVisibilityHandler);
    visibilityHandlersRef.current.push(messageVisibilityHandler);

    return messageChannelRef.current;
  };

  const subscribeToMentions = () => {
    if (mentionChannelRef.current) {
      console.log('[Chat] Mentions already subscribed, skipping.');
      return mentionChannelRef.current;
    }

    console.log('[Chat] Setting up mentions subscription');
    
    mentionChannelRef.current = supabase
      .channel(`mentions:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_mentions',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          console.log('[Chat] Received mention update:', payload);
          if (payload.eventType === 'INSERT' && payload.new.mentioned_user_id === currentUserId) {
            toast({
              title: "New Mention",
              description: "You were mentioned in a message",
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Chat] Mentions subscription status:', status);
      });

    const mentionVisibilityHandler = () => handleVisibilityChange(mentionChannelRef.current);
    document.addEventListener('visibilitychange', mentionVisibilityHandler);
    visibilityHandlersRef.current.push(mentionVisibilityHandler);

    return mentionChannelRef.current;
  };

  useEffect(() => {
    console.log('[Chat] Setting up subscriptions for channel:', channelId);
    
    // Clean up previous subscriptions
    if (messageChannelRef.current) {
      supabase.removeChannel(messageChannelRef.current);
      messageChannelRef.current = null;
    }
    if (mentionChannelRef.current) {
      supabase.removeChannel(mentionChannelRef.current);
      mentionChannelRef.current = null;
    }
    cleanupVisibilityHandlers();
    
    // Set up new subscriptions
    subscribeToMessages();
    subscribeToMentions();

    // Cleanup on unmount or channelId change
    return () => {
      console.log('[Chat] Cleaning up subscriptions');
      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current);
        messageChannelRef.current = null;
      }
      if (mentionChannelRef.current) {
        supabase.removeChannel(mentionChannelRef.current);
        mentionChannelRef.current = null;
      }
      if (initialDelayRef.current) {
        clearTimeout(initialDelayRef.current);
      }
      cleanupVisibilityHandlers();
      isSubscribingRef.current = false;
    };
  }, [channelId]); // Only re-run if channelId changes

  return {
    handleSubscriptionError,
    subscribeToMessages,
    subscribeToMentions,
  };
};
