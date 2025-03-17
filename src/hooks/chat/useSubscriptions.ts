
import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { CONNECTION_CONSTANTS } from '@/hooks/supabase-connection/constants';

interface SubscriptionState {
  status: 'SUBSCRIBED' | 'CONNECTING' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR',
  error?: Error
}

interface SubscriptionStates {
  messages?: SubscriptionState;
}

export const useSubscriptions = (
  channelId: string,
  currentUserId: string | null,
  retryCount: number,
  setRetryCount: (count: number) => void,
  onNewMessage: (payload: any) => Promise<void>,
  onMessageUpdate: (payload: any) => Promise<void>,
  onMessageDelete: (payload: any) => Promise<void>
) => {
  const messageChannelRef = useRef<RealtimeChannel | null>(null);
  const [subscriptionStates, setSubscriptionStates] = useState<SubscriptionStates>({});
  const lastMessageRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSubscriptionError = (error: Error) => {
    console.error(`[Chat] Subscription error:`, error);
    setSubscriptionStates(prev => ({
      ...prev,
      messages: { status: 'CHANNEL_ERROR' as const, error }
    }));
    
    if (retryCount < CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS) {
      // Use exponential backoff but with a shorter base delay for faster recovery
      const delay = Math.min(
        CONNECTION_CONSTANTS.BASE_RECONNECT_DELAY * Math.pow(1.5, retryCount),
        CONNECTION_CONSTANTS.MAX_RECONNECT_DELAY
      );
      console.log(`[Chat] Retrying in ${delay}ms (attempt ${retryCount + 1}/${CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS})`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        setRetryCount(retryCount + 1);
      }, delay);
    } else {
      console.error(`[Chat] Max retry attempts (${CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
    }
  };

  useEffect(() => {
    console.log('[Chat] Setting up subscriptions for channel:', channelId);
    let isSubscribed = true;

    const setupSubscriptions = async () => {
      if (!channelId) {
        console.log('[Chat] No channel ID provided, skipping subscription setup');
        return;
      }

      // Set status to connecting
      setSubscriptionStates(prev => ({
        ...prev,
        messages: { status: 'CONNECTING' }
      }));

      // Clean up existing channel if it exists
      if (messageChannelRef.current) {
        console.log('[Chat] Cleaning up existing channel');
        await supabase.removeChannel(messageChannelRef.current);
        messageChannelRef.current = null;
      }
      
      try {
        // Create a new channel with a unique name for messages
        const messageChannelName = `chat-messages-${channelId}-${Date.now()}`;
        console.log('[Chat] Creating new message channel:', messageChannelName);
        
        messageChannelRef.current = supabase.channel(messageChannelName);

        // Set up message changes subscription with explicit event types
        messageChannelRef.current
          .on('postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages',
              filter: `channel_id=eq.${channelId}`
            },
            async (payload) => {
              if (!isSubscribed) return;
              
              // Deduplicate messages by tracking the last message ID
              if (payload.new && payload.new.id === lastMessageRef.current) {
                console.log('[Chat] Ignoring duplicate message:', payload.new.id);
                return;
              }
              
              if (payload.new) {
                lastMessageRef.current = payload.new.id;
                await onNewMessage(payload);
              }
            }
          )
          .on('postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'chat_messages',
              filter: `channel_id=eq.${channelId}`
            },
            async (payload) => {
              if (!isSubscribed) return;
              await onMessageUpdate(payload);
            }
          )
          .on('postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'chat_messages',
              filter: `channel_id=eq.${channelId}`
            },
            async (payload) => {
              if (!isSubscribed) return;
              await onMessageDelete(payload);
            }
          );

        // Subscribe to the messages channel
        const messagesSubscription = await messageChannelRef.current.subscribe((status) => {
          console.log('[Chat] Message subscription status:', status);
          if (status === 'SUBSCRIBED') {
            setSubscriptionStates(prev => ({
              ...prev,
              messages: { status: 'SUBSCRIBED' }
            }));
          } else if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setSubscriptionStates(prev => ({
              ...prev,
              messages: { status: status as SubscriptionState['status'] }
            }));
            
            if (status === 'CHANNEL_ERROR' && retryCount < CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS) {
              setRetryCount(retryCount + 1);
            }
          }
        });

        console.log('[Chat] Message channel subscribed:', messagesSubscription);
      } catch (error) {
        console.error('[Chat] Error setting up subscriptions:', error);
        handleSubscriptionError(error as Error);
      }
    };

    setupSubscriptions();

    // Cleanup function
    return () => {
      console.log('[Chat] Cleaning up subscriptions');
      isSubscribed = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current)
          .catch(error => {
            console.error('[Chat] Error removing message channel:', error);
          });
        messageChannelRef.current = null;
      }
    };
  }, [channelId, currentUserId, retryCount, setRetryCount, onNewMessage, onMessageUpdate, onMessageDelete]);

  return {
    subscriptionStates,
    handleSubscriptionError
  };
};
