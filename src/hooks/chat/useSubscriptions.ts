
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef, useCallback } from 'react';

interface SubscriptionState {
  channel: RealtimeChannel | null;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastError?: Error;
}

export const useSubscriptions = (
  channelId: string,
  currentUserId: string | null,
  retryCount: number,
  setRetryCount: (count: number) => void,
  fetchMessages: () => Promise<void>
) => {
  const { toast } = useToast();
  const errorCountRef = useRef(0);
  const isSubscribingRef = useRef(false);
  const subscriptionStatesRef = useRef<Map<string, SubscriptionState>>(new Map());
  const visibilityHandlersRef = useRef<(() => void)[]>([]);

  const handleSubscriptionError = useCallback(() => {
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
  }, [retryCount, setRetryCount, toast]);

  const cleanupVisibilityHandlers = useCallback(() => {
    visibilityHandlersRef.current.forEach(handler => {
      document.removeEventListener('visibilitychange', handler);
    });
    visibilityHandlersRef.current = [];
  }, []);

  const cleanupChannel = useCallback(async (channelKey: string) => {
    const state = subscriptionStatesRef.current.get(channelKey);
    if (!state?.channel) return;
    
    try {
      console.log(`[Chat] Cleaning up channel: ${channelKey}`);
      await state.channel.unsubscribe();
      await supabase.removeChannel(state.channel);
      subscriptionStatesRef.current.delete(channelKey);
    } catch (error) {
      console.error(`[Chat] Error cleaning up channel ${channelKey}:`, error);
    }
  }, []);

  const handleVisibilityChange = useCallback((channelKey: string) => {
    const state = subscriptionStatesRef.current.get(channelKey);
    if (!state?.channel) return;
    
    if (document.visibilityState === 'visible') {
      if (state.status === 'disconnected') {
        state.channel.subscribe();
      }
    } else {
      state.channel.unsubscribe();
    }
  }, []);

  const setupChannel = useCallback(async (
    channelKey: string,
    config: {
      name: string;
      eventConfig: {
        event: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
        schema: string;
        table: string;
        filter?: string;
      };
      onEvent: (payload: any) => void;
    }
  ) => {
    if (isSubscribingRef.current) {
      console.log(`[Chat] Already subscribing to ${channelKey}, skipping.`);
      return;
    }

    // Clean up existing channel first
    await cleanupChannel(channelKey);

    isSubscribingRef.current = true;
    console.log(`[Chat] Setting up subscription for ${channelKey}`);

    try {
      const channel = supabase
        .channel(config.name)
        .on(
          'postgres_changes',
          {
            event: config.eventConfig.event,
            schema: config.eventConfig.schema,
            table: config.eventConfig.table,
            filter: config.eventConfig.filter,
          },
          config.onEvent
        );

      // Store the channel state
      subscriptionStatesRef.current.set(channelKey, {
        channel,
        status: 'connecting'
      });

      channel.subscribe((status) => {
        console.log(`[Chat] ${channelKey} subscription status:`, status);
        const state = subscriptionStatesRef.current.get(channelKey);
        
        if (state) {
          if (status === 'SUBSCRIBED') {
            state.status = 'connected';
            isSubscribingRef.current = false;
            errorCountRef.current = 0;
          } else if (status === 'CHANNEL_ERROR') {
            state.status = 'error';
            isSubscribingRef.current = false;
            handleSubscriptionError();
          } else if (status === 'CLOSED') {
            state.status = 'disconnected';
          }
          subscriptionStatesRef.current.set(channelKey, state);
        }
      });

      const visibilityHandler = () => handleVisibilityChange(channelKey);
      document.addEventListener('visibilitychange', visibilityHandler);
      visibilityHandlersRef.current.push(visibilityHandler);

      return channel;
    } catch (error) {
      console.error(`[Chat] Error setting up ${channelKey} subscription:`, error);
      isSubscribingRef.current = false;
      
      if (error instanceof Error) {
        subscriptionStatesRef.current.set(channelKey, {
          channel: null,
          status: 'error',
          lastError: error
        });
      }
      
      return null;
    }
  }, [cleanupChannel, handleSubscriptionError, handleVisibilityChange]);

  const subscribeToMessages = useCallback(async () => {
    return setupChannel('messages', {
      name: `messages:${channelId}`,
      eventConfig: {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      },
      onEvent: async (payload) => {
        console.log('[Chat] Received real-time update:', payload);
        await fetchMessages();
        
        if (payload.eventType === 'INSERT' && payload.new.sender_id !== currentUserId) {
          toast({
            title: "Nouveau message",
            description: "Un nouveau message a été reçu",
          });
        }
      }
    });
  }, [channelId, currentUserId, fetchMessages, setupChannel, toast]);

  const subscribeToMentions = useCallback(async () => {
    return setupChannel('mentions', {
      name: `mentions:${channelId}`,
      eventConfig: {
        event: '*',
        schema: 'public',
        table: 'message_mentions',
        filter: `channel_id=eq.${channelId}`,
      },
      onEvent: async (payload) => {
        console.log('[Chat] Received mention update:', payload);
        if (payload.eventType === 'INSERT' && payload.new.mentioned_user_id === currentUserId) {
          toast({
            title: "New Mention",
            description: "You were mentioned in a message",
          });
        }
      }
    });
  }, [channelId, currentUserId, setupChannel, toast]);

  useEffect(() => {
    let isMounted = true;
    console.log('[Chat] Setting up subscriptions for channel:', channelId);
    
    const cleanup = async () => {
      console.log('[Chat] Running cleanup');
      await Promise.all([
        cleanupChannel('messages'),
        cleanupChannel('mentions')
      ]);
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
  }, [channelId, cleanupChannel, cleanupVisibilityHandlers, subscribeToMentions, subscribeToMessages]);

  return {
    subscriptionStates: Object.fromEntries(subscriptionStatesRef.current),
    handleSubscriptionError,
    subscribeToMessages,
    subscribeToMentions,
  };
};
