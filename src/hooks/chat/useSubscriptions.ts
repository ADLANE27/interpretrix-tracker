
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

// Define our custom payload type
interface ExtendedPayload {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, any>;
  old?: Record<string, any>;
  errors: string | null;
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
  const instanceId = useRef<string>(`${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  const seenEvents = useRef<Set<string>>(new Set());

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
        // ALL clients (admin and interpreter) use the exact same channel name format
        // This ensures consistent channel naming across different user types
        const channelName = `chat-${channelId}`;
        console.log('[Chat] Creating new channel with name:', channelName);
        
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
              
              // Generate a unique event ID for deduplication
              const eventId = `${payload.eventType}-${
                payload.eventType === 'DELETE' ? 
                (payload.old as any)?.id : 
                (payload.new as any)?.id
              }-${payload.commit_timestamp}`;
              
              // Skip if we've already seen this exact event
              if (seenEvents.current.has(eventId)) {
                console.log('[Chat] Skipping duplicate event:', eventId);
                return;
              }
              
              // Add to seen events set for deduplication
              seenEvents.current.add(eventId);
              
              // Limit the size of the seen events set
              if (seenEvents.current.size > 100) {
                // Convert to array, remove oldest entries
                const eventsArray = Array.from(seenEvents.current);
                seenEvents.current = new Set(eventsArray.slice(-50));
              }
              
              // Create our extended payload with additional properties
              const extendedPayload: ExtendedPayload = {
                ...payload as any,
                eventType: (payload as any).eventType,
                receivedAt: Date.now()
              };

              // Update last event timestamp for health checks
              lastEventTimestamp.current = extendedPayload.receivedAt;

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
      if (timeSinceLastEvent > CONNECTION_CONSTANTS.BASE_RECONNECT_DELAY * 10 && channelRef.current) {
        console.log('[Chat] Subscription appears stalled, reconnecting...');
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
