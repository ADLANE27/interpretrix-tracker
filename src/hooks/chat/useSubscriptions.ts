
import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { CONNECTION_CONSTANTS } from '../supabase-connection/constants';

interface SubscriptionState {
  status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR',
  error?: Error
}

interface SubscriptionStates {
  messages?: SubscriptionState;
  mentions?: SubscriptionState;
}

export const useSubscriptions = (
  channelId: string,
  currentUserId: string | null,
  retryCount: number,
  setRetryCount: (count: number) => void,
  fetchMessages: () => Promise<void>
) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [subscriptionStates, setSubscriptionStates] = useState<SubscriptionStates>({});
  const lastEventTimeRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<number | null>(null);

  const handleSubscriptionError = (error: Error, type: 'messages' | 'mentions') => {
    console.error(`[Chat] ${type} subscription error:`, error);
    setSubscriptionStates(prev => ({
      ...prev,
      [type]: { status: 'CHANNEL_ERROR' as const, error }
    }));
    
    if (retryCount < CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS) {
      const backoffDelay = CONNECTION_CONSTANTS.BASE_RECONNECT_DELAY * Math.pow(2, retryCount);
      console.log(`[Chat] Retrying in ${backoffDelay}ms (attempt ${retryCount + 1})`);
      
      setTimeout(() => {
        setRetryCount(retryCount + 1);
      }, backoffDelay);
    } else {
      console.error(`[Chat] Max retry attempts (${CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS}) reached`);
    }
  };

  // Setup heartbeat to check if channel is still active
  useEffect(() => {
    if (!channelRef.current) return;
    
    const checkHeartbeat = () => {
      const now = Date.now();
      const timeSinceLastEvent = now - lastEventTimeRef.current;
      
      if (timeSinceLastEvent > CONNECTION_CONSTANTS.HEARTBEAT_TIMEOUT) {
        console.warn(`[Chat] No events received for ${timeSinceLastEvent}ms, reconnecting...`);
        
        // Force reconnection by incrementing retry count
        setRetryCount(count => count + 1);
        lastEventTimeRef.current = now;
      }
    };
    
    heartbeatIntervalRef.current = window.setInterval(
      checkHeartbeat, 
      CONNECTION_CONSTANTS.HEARTBEAT_INTERVAL
    );
    
    return () => {
      if (heartbeatIntervalRef.current !== null) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [channelRef.current, setRetryCount]);

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

      try {
        // Create a new channel with a unique name
        const channelName = `chat-${channelId}-${Date.now()}`;
        console.log('[Chat] Creating new channel:', channelName);
        
        channelRef.current = supabase.channel(channelName);

        // Set up message changes subscription with explicit event types
        channelRef.current
          .on('postgres_changes',
            {
              event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
              schema: 'public',
              table: 'chat_messages',
              filter: `channel_id=eq.${channelId}`
            },
            async (payload) => {
              if (!isSubscribed) return;
              lastEventTimeRef.current = Date.now(); // Update last event time
              console.log('[Chat] Message change received:', payload);
              await fetchMessages(); // Refresh messages when changes occur
            }
          );

        // Subscribe to the channel
        const channel = await channelRef.current.subscribe((status) => {
          console.log('[Chat] Subscription status:', status);
          lastEventTimeRef.current = Date.now(); // Update last event time on status change
          
          if (status === 'SUBSCRIBED') {
            // Fetch messages immediately after successful subscription
            fetchMessages().catch(err => 
              console.error('[Chat] Error fetching messages after subscription:', err)
            );
          }
        });

        console.log('[Chat] Channel subscribed:', channel);

        // Update subscription states
        setSubscriptionStates({
          messages: { status: 'SUBSCRIBED' },
          ...(currentUserId && { mentions: { status: 'SUBSCRIBED' } })
        });
        
        // Reset retry count on successful subscription
        if (retryCount > 0) {
          setRetryCount(0);
        }
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
      
      if (heartbeatIntervalRef.current !== null) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
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
