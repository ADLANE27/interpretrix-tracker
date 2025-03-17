
import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { CONNECTION_CONSTANTS } from '../supabase-connection/constants';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionState {
  status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR' | 'CONNECTING',
  error?: Error
}

interface SubscriptionStates {
  messages?: SubscriptionState;
  mentions?: SubscriptionState;
  presence?: SubscriptionState;
}

interface UserPresence {
  online: boolean;
  user_id: string;
  last_active: number;
}

export const useSubscriptions = (
  channelId: string,
  currentUserId: string | null,
  retryCount: number,
  setRetryCount: React.Dispatch<React.SetStateAction<number>>,
  fetchMessages: () => Promise<void>
) => {
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [subscriptionStates, setSubscriptionStates] = useState<SubscriptionStates>({});
  const lastEventTimeRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<number | null>(null);
  const subscriptionTimeoutRef = useRef<number | null>(null);
  const messageQueueRef = useRef<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [hasConnectivityIssue, setHasConnectivityIssue] = useState(false);

  // Enhanced error handling for subscription issues
  const handleSubscriptionError = useCallback((error: Error, type: keyof SubscriptionStates) => {
    console.error(`[Chat] ${type} subscription error:`, error);
    
    setSubscriptionStates(prev => ({
      ...prev,
      [type]: { status: 'CHANNEL_ERROR' as const, error }
    }));
    
    setHasConnectivityIssue(true);
    
    if (retryCount < CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS) {
      // Add randomized jitter to prevent all clients reconnecting simultaneously
      const jitter = Math.floor(Math.random() * CONNECTION_CONSTANTS.RECONNECT_JITTER);
      const backoffDelay = CONNECTION_CONSTANTS.BASE_RECONNECT_DELAY * 
        Math.pow(2, retryCount) + jitter;
        
      console.log(`[Chat] Retrying in ${backoffDelay}ms (attempt ${retryCount + 1})`);
      
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, backoffDelay);
    } else {
      console.error(`[Chat] Max retry attempts (${CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS}) reached`);
      
      toast({
        title: "Connection Issue",
        description: "Unable to establish a reliable connection. Please check your network and refresh the page.",
        variant: "destructive",
      });
    }
  }, [retryCount, setRetryCount, toast]);

  // Heartbeat mechanism to detect stale connections
  useEffect(() => {
    if (!channelRef.current) return;
    
    const checkHeartbeat = () => {
      const now = Date.now();
      const timeSinceLastEvent = now - lastEventTimeRef.current;
      
      if (timeSinceLastEvent > CONNECTION_CONSTANTS.HEARTBEAT_TIMEOUT) {
        console.warn(`[Chat] No events received for ${timeSinceLastEvent}ms, reconnecting...`);
        setHasConnectivityIssue(true);
        
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

  // Clear subscription timeout if component unmounts
  useEffect(() => {
    return () => {
      if (subscriptionTimeoutRef.current !== null) {
        clearTimeout(subscriptionTimeoutRef.current);
        subscriptionTimeoutRef.current = null;
      }
    };
  }, []);

  // Core subscription setup
  useEffect(() => {
    console.log('[Chat] Setting up subscriptions for channel:', channelId);
    let isSubscribed = true;

    const setupSubscriptions = async () => {
      if (!channelId) {
        console.log('[Chat] No channel ID provided, skipping subscription setup');
        return;
      }

      // Signal we're connecting
      setSubscriptionStates(prev => ({
        ...prev,
        messages: { status: 'CONNECTING' }
      }));

      // Clean up existing channel if it exists
      if (channelRef.current) {
        console.log('[Chat] Cleaning up existing channel');
        try {
          await supabase.removeChannel(channelRef.current);
        } catch (error) {
          console.warn('[Chat] Error removing channel:', error);
        }
        channelRef.current = null;
      }

      try {
        // Create a new channel with a stable but unique name
        // Using channelId as the core identifier ensures reconnects use same channel
        const channelName = `${CONNECTION_CONSTANTS.CHANNEL_PREFIX}:${channelId}`;
        console.log('[Chat] Creating new channel:', channelName);
        
        channelRef.current = supabase.channel(channelName, {
          config: {
            presence: { key: currentUserId || 'anonymous' }
          }
        });

        // Set a timeout to detect subscription failures
        if (subscriptionTimeoutRef.current) {
          clearTimeout(subscriptionTimeoutRef.current);
        }
        
        subscriptionTimeoutRef.current = window.setTimeout(() => {
          if (!isSubscribed) return;
          
          if (subscriptionStates.messages?.status !== 'SUBSCRIBED') {
            console.error('[Chat] Subscription timed out after', 
              CONNECTION_CONSTANTS.SUBSCRIPTION_TIMEOUT, 'ms');
              
            setSubscriptionStates(prev => ({
              ...prev,
              messages: { status: 'TIMED_OUT' }
            }));
            
            setHasConnectivityIssue(true);
            setRetryCount(prev => prev + 1);
          }
        }, CONNECTION_CONSTANTS.SUBSCRIPTION_TIMEOUT);

        // Set up presence handling for user online status
        channelRef.current
          .on('presence', { event: 'sync' }, () => {
            if (!channelRef.current) return;
            
            const presenceState = channelRef.current.presenceState() as RealtimePresenceState<UserPresence>;
            const online = Object.values(presenceState)
              .flat()
              .map(presence => presence.user_id)
              .filter(Boolean);
              
            setOnlineUsers(online);
            console.log('[Chat] Online users:', online);
            
            lastEventTimeRef.current = Date.now();
          })
          .on('presence', { event: 'join' }, async (payload) => {
            if (!isSubscribed) return;
            console.log('[Chat] User joined:', payload);
            lastEventTimeRef.current = Date.now();
          })
          .on('presence', { event: 'leave' }, async (payload) => {
            if (!isSubscribed) return;
            console.log('[Chat] User left:', payload);
            lastEventTimeRef.current = Date.now();
          });

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
              lastEventTimeRef.current = Date.now();
              console.log('[Chat] Message change received:', payload);
              
              // Track message IDs to prevent duplicate processing
              const messageId = payload.new?.id || payload.old?.id;
              if (messageId && messageQueueRef.current.has(messageId)) {
                console.log('[Chat] Skipping already processed message:', messageId);
                return;
              }
              
              if (messageId) {
                messageQueueRef.current.add(messageId);
                // Limit queue size to prevent memory leaks
                if (messageQueueRef.current.size > CONNECTION_CONSTANTS.MESSAGE_QUEUE_LIMIT) {
                  const iterator = messageQueueRef.current.values();
                  messageQueueRef.current.delete(iterator.next().value);
                }
              }
              
              await fetchMessages(); // Refresh messages when changes occur
              
              // If we reached this point, connection is healthy
              if (hasConnectivityIssue) {
                setHasConnectivityIssue(false);
              }
            }
          );

        // Broadcast presence for online status when current user is available
        if (currentUserId) {
          await channelRef.current.track({
            online: true,
            user_id: currentUserId,
            last_active: Date.now()
          });
        }

        // Subscribe to the channel
        const channel = await channelRef.current.subscribe((status) => {
          console.log('[Chat] Subscription status:', status);
          lastEventTimeRef.current = Date.now(); // Update last event time on status change
          
          if (status === 'SUBSCRIBED') {
            // Fetch messages immediately after successful subscription
            fetchMessages().catch(err => 
              console.error('[Chat] Error fetching messages after subscription:', err)
            );
            
            // Clear any timeout since we've subscribed successfully
            if (subscriptionTimeoutRef.current) {
              clearTimeout(subscriptionTimeoutRef.current);
              subscriptionTimeoutRef.current = null;
            }
            
            // Reset connectivity issue flag
            setHasConnectivityIssue(false);
          }
          
          // Update subscription state
          setSubscriptionStates({
            messages: { status: status as any }, // Cast is safe as we know the values
            presence: { status: status as any }
          });
        });

        console.log('[Chat] Channel subscribed:', channel);

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
      
      if (subscriptionTimeoutRef.current !== null) {
        clearTimeout(subscriptionTimeoutRef.current);
        subscriptionTimeoutRef.current = null;
      }
      
      if (channelRef.current) {
        // Send offline status before removing channel
        if (currentUserId) {
          channelRef.current.track({
            online: false,
            user_id: currentUserId,
            last_active: Date.now()
          }).catch(error => {
            console.warn('[Chat] Error updating presence before cleanup:', error);
          });
        }
        
        supabase.removeChannel(channelRef.current)
          .catch(error => {
            console.error('[Chat] Error removing channel:', error);
          });
        channelRef.current = null;
      }
    };
  }, [channelId, currentUserId, fetchMessages, retryCount, setRetryCount, handleSubscriptionError]);

  return {
    subscriptionStates,
    handleSubscriptionError,
    onlineUsers,
    hasConnectivityIssue
  };
};
