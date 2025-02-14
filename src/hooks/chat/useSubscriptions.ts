
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';

const handleVisibilityChange = (channel: RealtimeChannel) => {
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
  const channelRef = useRef<RealtimeChannel | null>(null);

  const handleSubscriptionError = () => {
    errorCountRef.current += 1;
    
    // N'afficher l'erreur qu'après 3 tentatives échouées
    if (errorCountRef.current >= 3) {
      errorCountRef.current = 0; // Reset le compteur
      toast({
        title: "Problème de connexion",
        description: "Tentative de reconnexion en cours...",
        variant: "destructive",
      });
    }
    setRetryCount(retryCount + 1);
  };

  const subscribeToMessages = () => {
    if (isSubscribingRef.current || channelRef.current) {
      console.log('[Chat] Already subscribed or subscribing, skipping.');
      return;
    }

    isSubscribingRef.current = true;
    console.log('[Chat] Setting up real-time subscription for channel:', channelId);
    
    channelRef.current = supabase
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
        console.log('[Chat] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          isSubscribingRef.current = false;
          errorCountRef.current = 0;
        }
        if (status === 'CHANNEL_ERROR') {
          isSubscribingRef.current = false;
          handleSubscriptionError();
        }
      });

    document.addEventListener('visibilitychange', () => handleVisibilityChange(channelRef.current!));

    return channelRef.current;
  };

  const subscribeToMentions = () => {
    console.log('[Chat] Setting up mentions subscription');
    
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
      )
      .subscribe();

    document.addEventListener('visibilitychange', () => handleVisibilityChange(channel));

    return channel;
  };

  // Cleanup function
  useEffect(() => {
    if (initialDelayRef.current) {
      clearTimeout(initialDelayRef.current);
    }

    // Initial subscription
    const messageChannel = subscribeToMessages();
    const mentionChannel = subscribeToMentions();

    // Cleanup on unmount
    return () => {
      console.log('[Chat] Cleaning up subscriptions');
      if (messageChannel) {
        supabase.removeChannel(messageChannel);
      }
      if (mentionChannel) {
        supabase.removeChannel(mentionChannel);
      }
      if (initialDelayRef.current) {
        clearTimeout(initialDelayRef.current);
      }
      channelRef.current = null;
      isSubscribingRef.current = false;
    };
  }, [channelId]); // Only re-run if channelId changes

  return {
    handleSubscriptionError,
    subscribeToMessages,
    subscribeToMentions,
  };
};
