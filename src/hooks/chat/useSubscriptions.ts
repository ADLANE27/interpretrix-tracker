
import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { CONNECTION_CONSTANTS } from '@/hooks/supabase-connection/constants';

interface SubscriptionState {
  status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR',
  error?: Error
}

interface SubscriptionStates {
  messages?: SubscriptionState;
  mentions?: SubscriptionState;
}

// Extended payload type to include our custom property
interface ExtendedPayload extends RealtimePostgresChangesPayload<{ [key: string]: any }> {
  receivedAt?: number;
}

export const useSubscriptions = (
  channelId: string,
  currentUserId: string | null,
  retryCount: number,
  setRetryCount: (count: number) => void,
  onRealtimeEvent: (payload: ExtendedPayload) => void
) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [subscriptionStates, setSubscriptionStates] = useState<SubscriptionStates>({});
  const lastEventTimestamp = useRef<number>(Date.now());

  const handleSubscriptionError = (error: Error, type: 'messages' | 'mentions') => {
    console.error(`[Chat] ${type} subscription error:`, error);
    setSubscriptionStates(prev => ({
      ...prev,
      [type]: { status: 'CHANNEL_ERROR' as const, error }
    }));
    
    if (retryCount < CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS) {
      setTimeout(() => {
        setRetryCount(retryCount + 1);
      }, CONNECTION_CONSTANTS.BASE_RECONNECT_DELAY * Math.pow(2, retryCount));
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

      try {
        // Create a new channel with a unique name based on channelId and timestamp to avoid conflicts
        const channelName = `chat-${channelId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        console.log('[Chat] Creating new channel with unique name:', channelName);
        
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
            (payload) => {
              if (!isSubscribed) return;
              
              // Cast to our extended type and add timestamp
              const extendedPayload = payload as ExtendedPayload;
              const now = Date.now();
              // Add timestamp to track when we received this event
              extendedPayload.receivedAt = now;
              lastEventTimestamp.current = now;
              
              console.log('[Chat] Message change received:', extendedPayload.eventType, extendedPayload);
              onRealtimeEvent(extendedPayload);
            }
          );

        // Subscribe to the channel
        const channel = await channelRef.current.subscribe((status) => {
          console.log('[Chat] Subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('[Chat] Successfully subscribed to channel:', channelName);
            setSubscriptionStates({
              messages: { status: 'SUBSCRIBED' },
              ...(currentUserId && { mentions: { status: 'SUBSCRIBED' } })
            });
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[Chat] Channel error for channel:', channelName);
            handleSubscriptionError(new Error(`Channel error for ${channelName}`), 'messages');
          }
        });

        console.log('[Chat] Channel subscription initiated:', channel);
      } catch (error) {
        console.error('[Chat] Error setting up subscriptions:', error);
        handleSubscriptionError(error as Error, 'messages');
      }
    };

    setupSubscriptions();

    // Set up a health check interval to detect stalled subscriptions
    const healthCheckInterval = setInterval(() => {
      const now = Date.now();
      const lastEvent = lastEventTimestamp.current;
      const timeSinceLastEvent = now - lastEvent;
      
      console.log(`[Chat] Health check: ${timeSinceLastEvent}ms since last event`);
      
      // If it's been too long since we received an event, reconnect
      // Use BASE_RECONNECT_DELAY instead of MAX_RECONNECT_DELAY which doesn't exist
      if (timeSinceLastEvent > CONNECTION_CONSTANTS.BASE_RECONNECT_DELAY * 10 && channelRef.current) {
        console.log('[Chat] Subscription appears stalled, reconnecting...');
        // Fix: Pass a number directly instead of a function
        setRetryCount(retryCount + 1);
      }
    }, 30000); // Check every 30 seconds

    // Cleanup function
    return () => {
      console.log('[Chat] Cleaning up subscriptions');
      isSubscribed = false;
      clearInterval(healthCheckInterval);
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
          .catch(error => {
            console.error('[Chat] Error removing channel:', error);
          });
        channelRef.current = null;
      }
    };
  }, [channelId, currentUserId, onRealtimeEvent, retryCount, setRetryCount]);

  return {
    subscriptionStates,
    handleSubscriptionError,
    isSubscribed: subscriptionStates.messages?.status === 'SUBSCRIBED',
    lastEventTimestamp: lastEventTimestamp.current
  };
};
