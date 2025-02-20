
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

  const cleanupChannel = async (channel: RealtimeChannel | null) => {
    if (!channel) return;
    
    try {
      console.log('[Chat] Cleaning up channel');
      await channel.unsubscribe();
      await supabase.removeChannel(channel);
    } catch (error) {
      console.error('[Chat] Error cleaning up channel:', error);
    }
  };

  const subscribeToMessages = async () => {
    if (isSubscribingRef.current) {
      console.log('[Chat] Already subscribing to messages, skipping.');
      return null;
    }

    // Clean up existing channel first
    if (messageChannelRef.current) {
      console.log('[Chat] Cleaning up existing message channel');
      await cleanupChannel(messageChannelRef.current);
      messageChannelRef.current = null;
    }

    isSubscribingRef.current = true;
    console.log('[Chat] Setting up real-time subscription for channel:', channelId);

    try {
      const channel = supabase
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
        );

      messageChannelRef.current = channel;

      channel.subscribe((status) => {
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

      return channel;
    } catch (error) {
      console.error('[Chat] Error setting up message subscription:', error);
      isSubscribingRef.current = false;
      return null;
    }
  };

  const subscribeToMentions = async () => {
    // Clean up existing channel first
    if (mentionChannelRef.current) {
      console.log('[Chat] Cleaning up existing mention channel');
      await cleanupChannel(mentionChannelRef.current);
      mentionChannelRef.current = null;
    }

    console.log('[Chat] Setting up mentions subscription');
    
    try {
      const channel = supabase
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
        );

      mentionChannelRef.current = channel;

      channel.subscribe((status) => {
        console.log('[Chat] Mentions subscription status:', status);
      });

      const mentionVisibilityHandler = () => handleVisibilityChange(mentionChannelRef.current);
      document.addEventListener('visibilitychange', mentionVisibilityHandler);
      visibilityHandlersRef.current.push(mentionVisibilityHandler);

      return channel;
    } catch (error) {
      console.error('[Chat] Error setting up mention subscription:', error);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;
    console.log('[Chat] Setting up subscriptions for channel:', channelId);
    
    const cleanup = async () => {
      console.log('[Chat] Running cleanup');
      
      if (messageChannelRef.current) {
        await cleanupChannel(messageChannelRef.current);
        messageChannelRef.current = null;
      }
      
      if (mentionChannelRef.current) {
        await cleanupChannel(mentionChannelRef.current);
        mentionChannelRef.current = null;
      }
      
      if (initialDelayRef.current) {
        clearTimeout(initialDelayRef.current);
      }
      
      cleanupVisibilityHandlers();
      isSubscribingRef.current = false;
    };

    const setupSubscriptions = async () => {
      if (!isMounted) return;
      
      console.log('[Chat] Setting up new subscriptions');
      await cleanup();
      
      if (!isMounted) return;
      await subscribeToMessages();
      
      if (!isMounted) return;
      await subscribeToMentions();
    };

    void setupSubscriptions();

    return () => {
      isMounted = false;
      void cleanup();
    };
  }, [channelId]); // Only re-run if channelId changes

  return {
    handleSubscriptionError,
    subscribeToMessages,
    subscribeToMentions,
  };
};
