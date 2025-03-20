
import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { CONNECTION_CONSTANTS } from '@/hooks/supabase-connection/constants';
import { eventEmitter, EVENT_UNREAD_MENTIONS_UPDATED } from '@/lib/events';

// New event name for incoming messages
export const EVENT_NEW_MESSAGE_RECEIVED = 'new_message_received';

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
  const userRole = useRef<'admin' | 'interpreter' | null>(null);

  // Determine user role for logging
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          userRole.current = data.role as 'admin' | 'interpreter';
        }
      } catch (error) {
        console.error('[useSubscriptions] Error determining user role:', error);
      }
    };
    
    checkUserRole();
  }, []);

  const handleSubscriptionError = (error: Error, type: 'messages' | 'mentions') => {
    console.error(`[Chat ${userRole.current}] ${type} subscription error:`, error);
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
    console.log(`[Chat ${userRole.current}] Setting up subscriptions for channel:`, channelId);
    let isSubscribed = true;

    const setupSubscriptions = async () => {
      if (!channelId) {
        console.log(`[Chat ${userRole.current}] No channel ID provided, skipping subscription setup`);
        return;
      }

      // Clean up existing channel if it exists
      if (channelRef.current) {
        console.log(`[Chat ${userRole.current}] Cleaning up existing channel`);
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      try {
        // ALL clients (admin and interpreter) use the exact same channel name format
        // This ensures consistent channel naming across different user types
        const channelName = `chat-${channelId}`;
        console.log(`[Chat ${userRole.current}] Creating new channel with name:`, channelName);
        
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
            (payload: RealtimePostgresChangesPayload<any>) => {
              if (!isSubscribed) return;
              
              // Generate a unique event ID for deduplication
              const eventId = `${payload.eventType}-${
                payload.eventType === 'DELETE' ? 
                (payload.old as any)?.id : 
                (payload.new as any)?.id
              }-${payload.commit_timestamp}`;
              
              // Skip if we've already seen this exact event
              if (seenEvents.current.has(eventId)) {
                console.log(`[Chat ${userRole.current}] Skipping duplicate event:`, eventId);
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
                eventType: payload.eventType,
                receivedAt: Date.now()
              };

              // Update last event timestamp for health checks
              lastEventTimestamp.current = extendedPayload.receivedAt;

              console.log(`[Chat ${userRole.current}] Message change received:`, extendedPayload.eventType, extendedPayload);
              
              // Call the provided callback
              onRealtimeEvent(extendedPayload);
              
              // Emit a global event for new messages that can be listened to anywhere in the app
              // Only emit for INSERT events and if the message is not from the current user
              if (extendedPayload.eventType === 'INSERT' && 
                  extendedPayload.new && 
                  extendedPayload.new.sender_id !== currentUserId) {
                console.log(`[Chat ${userRole.current}] Emitting new message event`, extendedPayload.new);
                eventEmitter.emit(EVENT_NEW_MESSAGE_RECEIVED, {
                  message: extendedPayload.new,
                  channelId
                });
              }
            }
          );

        // Subscribe to the channel
        const channel = await channelRef.current.subscribe((status) => {
          console.log(`[Chat ${userRole.current}] Subscription status:`, status);
          
          if (status === 'SUBSCRIBED') {
            console.log(`[Chat ${userRole.current}] Successfully subscribed to channel:`, channelName);
            setSubscriptionStates({
              messages: { status: 'SUBSCRIBED' },
              ...(currentUserId && { mentions: { status: 'SUBSCRIBED' } })
            });
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`[Chat ${userRole.current}] Channel error for channel:`, channelName);
            handleSubscriptionError(new Error(`Channel error for ${channelName}`), 'messages');
          }
        });

        console.log(`[Chat ${userRole.current}] Channel subscription initiated:`, channel);
      } catch (error) {
        console.error(`[Chat ${userRole.current}] Error setting up subscriptions:`, error);
        handleSubscriptionError(error as Error, 'messages');
      }
    };

    setupSubscriptions();

    // Set up a health check interval to detect stalled subscriptions
    const healthCheckInterval = setInterval(() => {
      const now = Date.now();
      const lastEvent = lastEventTimestamp.current;
      const timeSinceLastEvent = now - lastEvent;
      
      console.log(`[Chat ${userRole.current}] Health check: ${timeSinceLastEvent}ms since last event`);
      
      // If it's been too long since we received an event, reconnect
      if (timeSinceLastEvent > CONNECTION_CONSTANTS.BASE_RECONNECT_DELAY * 10 && channelRef.current) {
        console.log(`[Chat ${userRole.current}] Subscription appears stalled, reconnecting...`);
        setRetryCount(retryCount + 1);
      }
    }, 30000); // Check every 30 seconds

    // Cleanup function
    return () => {
      console.log(`[Chat ${userRole.current}] Cleaning up subscriptions`);
      isSubscribed = false;
      clearInterval(healthCheckInterval);
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
          .catch(error => {
            console.error(`[Chat ${userRole.current}] Error removing channel:`, error);
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
