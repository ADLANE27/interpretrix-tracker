
import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionState {
  status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR',
  error?: Error
}

interface SubscriptionStates {
  messages?: SubscriptionState;
  mentions?: SubscriptionState;
}

type SubscriptionStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';

export const useSubscriptions = (
  channelId: string,
  currentUserId: string | null,
  retryCount: number,
  setRetryCount: (count: number) => void,
  fetchMessages: () => Promise<void>
) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [subscriptionStates, setSubscriptionStates] = useState<SubscriptionStates>({});

  const handleSubscriptionError = (error: Error, type: 'messages' | 'mentions') => {
    console.error(`[Chat] ${type} subscription error:`, error);
    setSubscriptionStates(prev => ({
      ...prev,
      [type]: { status: 'CHANNEL_ERROR' as const, error }
    }));
    
    if (retryCount < 3) {
      setTimeout(() => {
        setRetryCount(retryCount + 1);
      }, 1000 * Math.pow(2, retryCount)); // Exponential backoff
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

      // Clean up existing channel if it exists
      if (channelRef.current) {
        console.log('[Chat] Cleaning up existing channel');
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // Create a new channel with a unique name
      const channelName = `chat-${channelId}-${Date.now()}`;
      console.log('[Chat] Creating new channel:', channelName);
      
      try {
        channelRef.current = supabase.channel(channelName);

        // Set up message changes subscription
        channelRef.current
          .on('postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'chat_messages',
              filter: `channel_id=eq.${channelId}`
            },
            async (payload) => {
              if (!isSubscribed) return;
              console.log('[Chat] Message change received:', payload);
              await fetchMessages();
            }
          );

        // Set up mentions subscription if there's a current user
        if (currentUserId) {
          channelRef.current
            .on('postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'message_mentions',
                filter: `channel_id=eq.${channelId}`
              },
              async (payload) => {
                if (!isSubscribed) return;
                console.log('[Chat] Mention change received:', payload);
                await fetchMessages();
              }
            );
        }

        // Subscribe to the channel and subscribe() returns the channel instance
        const channel = await channelRef.current.subscribe();
        console.log('[Chat] Channel subscribed:', channel);

        // After successful subscription, update states
        setSubscriptionStates({
          messages: { status: 'SUBSCRIBED' },
          ...(currentUserId && { mentions: { status: 'SUBSCRIBED' } })
        });
      } catch (error) {
        console.error('[Chat] Error setting up subscriptions:', error);
        handleSubscriptionError(error as Error, 'messages');
      }
    };

    setupSubscriptions();

    // Cleanup function
    return () => {
      console.log('[Chat] Cleaning up subscriptions');
      isSubscribed = false;
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
          .catch(error => {
            console.error('[Chat] Error removing channel:', error);
          });
        channelRef.current = null;
      }
    };
  }, [channelId, currentUserId, fetchMessages, retryCount, setRetryCount]);

  return {
    subscriptionStates,
    handleSubscriptionError
  };
};
