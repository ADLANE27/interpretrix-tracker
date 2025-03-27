import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  RETRY_MAX,
  RETRY_DELAY_BASE,
  CONNECTION_TIMEOUT,
  CONNECTION_STATUS_DEBOUNCE_TIME,
  RECONNECT_STAGGER_INTERVAL,
  RECONNECT_STAGGER_MAX_DELAY,
  RECONNECT_PERIODIC_INTERVAL,
  DEBUG_MODE
} from './constants';
import { useToast } from '@/components/ui/use-toast';
import { EventDebouncer } from './eventDebouncer';
import { debounce } from '@/lib/utils';

interface SubscriptionStatus {
  isSubscribed: boolean;
  retryCount: number;
  maxRetriesReached: boolean;
  lastEventTimestamp: number | null;
  error: Error | null;
}

interface ConnectionMonitorProps {
  channelId: string | null;
  userId: string | null;
  retryCount: number;
  setRetryCount: React.Dispatch<React.SetStateAction<number>>;
  handleRealtimeMessage: (payload: any) => Promise<void>;
}

export const useConnectionMonitor = ({
  channelId,
  userId,
  retryCount,
  setRetryCount,
  handleRealtimeMessage
}: ConnectionMonitorProps) => {
  const [subscriptionStates, setSubscriptionStates] = useState<SubscriptionStatus>({
    isSubscribed: false,
    retryCount: 0,
    maxRetriesReached: false,
    lastEventTimestamp: null,
    error: null,
  });
  const [isForceReconnecting, setIsForceReconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [reconnectingFor, setReconnectingFor] = useState(0);
  const [lastEventTimestamp, setLastEventTimestamp] = useState<number | null>(null);
  const [isPeriodicReconnecting, setIsPeriodicReconnecting] = useState(false);
  const [periodicReconnectStartTime, setPeriodicReconnectStartTime] = useState<number | null>(null);
  const { toast } = useToast();
  const eventDebouncer = new EventDebouncer();
  const maxRetries = RETRY_MAX;
  const retryDelayBase = RETRY_DELAY_BASE;
  const connectionTimeout = CONNECTION_TIMEOUT;
  const reconnectStaggerInterval = RECONNECT_STAGGER_INTERVAL;
  const reconnectStaggerMaxDelay = RECONNECT_STAGGER_MAX_DELAY;
  const reconnectPeriodicInterval = RECONNECT_PERIODIC_INTERVAL;

  // Debounced function to update connection status
  const debouncedSetConnectionError = useCallback(
    debounce((error: boolean) => {
      setConnectionError(error);
    }, CONNECTION_STATUS_DEBOUNCE_TIME),
    []
  );

  // Reset connection error state
  const resetConnectionError = useCallback(() => {
    debouncedSetConnectionError(false);
    setReconnectingFor(0);
  }, [debouncedSetConnectionError]);

  // Function to handle subscription errors
  const handleSubscriptionError = useCallback((error: Error) => {
    console.error('[Realtime] Subscription error:', error);
    setSubscriptionStates(prevState => ({
      ...prevState,
      error: error,
      isSubscribed: false,
    }));
    debouncedSetConnectionError(true);
  }, [debouncedSetConnectionError]);

  // Function to handle successful subscription
  const handleSubscriptionSuccess = useCallback(() => {
    console.log('[Realtime] Subscription successful');
    setSubscriptionStates(prevState => ({
      ...prevState,
      isSubscribed: true,
      error: null,
    }));
    resetConnectionError();
  }, [resetConnectionError]);

  // Function to handle disconnection
  const handleDisconnection = useCallback(() => {
    console.warn('[Realtime] Disconnected from realtime server');
    setSubscriptionStates(prevState => ({
      ...prevState,
      isSubscribed: false,
    }));
    debouncedSetConnectionError(true);
  }, [debouncedSetConnectionError]);

  // Function to handle reconnection
  const handleReconnection = useCallback(() => {
    console.log('[Realtime] Reconnected to realtime server');
    setSubscriptionStates(prevState => ({
      ...prevState,
      isSubscribed: true,
      error: null,
    }));
    resetConnectionError();
  }, [resetConnectionError]);

  // Function to handle max retries reached
  const handleMaxRetriesReached = useCallback(() => {
    console.error('[Realtime] Max retries reached. Stopping reconnection attempts.');
    setSubscriptionStates(prevState => ({
      ...prevState,
      maxRetriesReached: true,
    }));
    debouncedSetConnectionError(true);
    
    // Show a toast notification
    toast({
      title: "Erreur de connexion",
      description: "Impossible de se reconnecter au serveur en temps réel. Veuillez rafraîchir la page.",
      variant: "destructive",
    });
  }, [debouncedSetConnectionError, toast]);

  // Function to force reconnect
  const forceReconnect = useCallback(async () => {
    if (isForceReconnecting) return;
    
    console.log('[Realtime] Force reconnect triggered');
    setIsForceReconnecting(true);
    setRetryCount(0); // Reset retry count
    setSubscriptionStates(prevState => ({
      ...prevState,
      maxRetriesReached: false,
    }));
    resetConnectionError();
    
    // Small delay before attempting to reconnect
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsForceReconnecting(false);
  }, [isForceReconnecting, resetConnectionError, setRetryCount]);

  // Periodic Reconnection Logic
  const startPeriodicReconnect = useCallback(() => {
    if (isPeriodicReconnecting) return;
    
    console.log('[Realtime] Starting periodic reconnect attempts');
    setIsPeriodicReconnecting(true);
    setPeriodicReconnectStartTime(Date.now());
  }, [isPeriodicReconnecting]);

  useEffect(() => {
    let periodicReconnectTimer: NodeJS.Timeout | null = null;
    
    if (isPeriodicReconnecting && periodicReconnectStartTime !== null) {
      periodicReconnectTimer = setTimeout(() => {
        console.log('[Realtime] Attempting periodic reconnect');
        setRetryCount(0); // Reset retry count for periodic reconnect
        setSubscriptionStates(prevState => ({
          ...prevState,
          maxRetriesReached: false,
        }));
        resetConnectionError();
      }, reconnectPeriodicInterval);
    }
    
    return () => {
      if (periodicReconnectTimer) {
        clearTimeout(periodicReconnectTimer);
      }
    };
  }, [isPeriodicReconnecting, periodicReconnectStartTime, setRetryCount, resetConnectionError, reconnectPeriodicInterval]);

  // Staggered Reconnection Logic
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout | null = null;
    
    if (!subscriptionStates.isSubscribed && !subscriptionStates.maxRetriesReached) {
      const delay = Math.min(retryCount * reconnectStaggerInterval, reconnectStaggerMaxDelay);
      
      reconnectTimeout = setTimeout(() => {
        if (retryCount < maxRetries) {
          setRetryCount(prevCount => prevCount + 1);
          setReconnectingFor(retryCount);
          console.log(`[Realtime] Reconnecting attempt ${retryCount + 1} after ${delay}ms`);
        } else {
          handleMaxRetriesReached();
        }
      }, delay);
    } else {
      // If we are subscribed, reset the retry count
      if (subscriptionStates.isSubscribed) {
        setRetryCount(0);
        setReconnectingFor(0);
      }
    }
    
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [subscriptionStates.isSubscribed, subscriptionStates.maxRetriesReached, retryCount, maxRetries, handleMaxRetriesReached, setRetryCount, reconnectStaggerInterval, reconnectStaggerMaxDelay]);

  // Realtime Subscription Logic
  useEffect(() => {
    if (!channelId || !userId) return;
    
    let subscribed = false;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const subscribeToChannel = async () => {
      try {
        console.log(`[Realtime] Attempting to subscribe to channel: ${channelId} (Attempt ${retryCount + 1})`);
        
        const { data: existingSubscription, error: fetchError } = await supabase
          .from('channel_subscriptions')
          .select('*')
          .eq('channel_id', channelId)
          .eq('user_id', userId)
          .single();
        
        if (fetchError && fetchError.message.includes('No rows found')) {
          console.log(`[Realtime] No existing subscription found for user ${userId} in channel ${channelId}. Creating a new one.`);
          
          const { error: insertError } = await supabase
            .from('channel_subscriptions')
            .insert([{ channel_id: channelId, user_id: userId }]);
          
          if (insertError) {
            console.error('[Realtime] Error creating channel subscription:', insertError);
            handleSubscriptionError(insertError);
            return;
          }
          console.log(`[Realtime] Successfully created channel subscription for user ${userId} in channel ${channelId}.`);
        } else if (fetchError) {
          console.error('[Realtime] Error fetching channel subscription:', fetchError);
          handleSubscriptionError(fetchError);
          return;
        } else {
          console.log(`[Realtime] Existing subscription found for user ${userId} in channel ${channelId}.`);
        }
        
        // Clear any existing realtime subscriptions
        await supabase.removeChannel(channelId);
        
        const channel = supabase.channel(channelId);
        
        channel
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'chat_messages',
            filter: `channel_id=eq.${channelId}`
          }, (payload) => {
            if (eventDebouncer.shouldProcessEvent(`message-${payload.eventType}-${payload.new?.id || payload.old?.id}`, Date.now())) {
              handleRealtimeMessage(payload);
              setLastEventTimestamp(Date.now());
            }
          })
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'message_mentions',
            filter: `channel_id=eq.${channelId}`
          }, (payload) => {
            if (eventDebouncer.shouldProcessEvent(`mention-${payload.eventType}-${payload.new?.id || payload.old?.id}`, Date.now())) {
              handleRealtimeMessage(payload);
              setLastEventTimestamp(Date.now());
            }
          })
          .on('presence', { event: 'sync' }, () => {
            if (DEBUG_MODE) {
              console.log(`[Realtime] Presence sync event for channel: ${channelId}`);
            }
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            if (DEBUG_MODE) {
              console.log(`[Realtime] User(s) ${newPresences.map((p: any) => p.userId).join(', ')} joined channel ${channelId}`);
            }
          })
          .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            if (DEBUG_MODE) {
              console.log(`[Realtime] User(s) ${leftPresences.map((p: any) => p.userId).join(', ')} left channel ${channelId}`);
            }
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              subscribed = true;
              handleSubscriptionSuccess();
              
              // Fetch initial presence data after subscribing
              const presence = channel.presenceState();
              if (DEBUG_MODE) {
                console.log(`[Realtime] Initial presence data for channel ${channelId}:`, presence);
              }
            } else if (status === 'CHANNEL_ERROR') {
              console.error(`[Realtime] Channel error for channel ${channelId}`);
              handleSubscriptionError(new Error(`Channel error: ${status}`));
            } else if (status === 'CLOSED') {
              handleDisconnection();
            }
          });
        
        timeoutId = setTimeout(() => {
          if (!subscribed) {
            const errorMessage = `[Realtime] Subscription timeout for channel ${channelId} after ${connectionTimeout}ms`;
            console.error(errorMessage);
            handleSubscriptionError(new Error(errorMessage));
            channel.unsubscribe();
          }
        }, connectionTimeout);
      } catch (error: any) {
        console.error('[Realtime] Unexpected error during subscription:', error);
        handleSubscriptionError(error);
      }
    };
    
    subscribeToChannel();
    
    return () => {
      console.log(`[Realtime] Unsubscribing from channel: ${channelId}`);
      supabase.removeChannel(channelId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [channelId, userId, retryCount, handleSubscriptionSuccess, handleSubscriptionError, handleDisconnection, handleRealtimeMessage, connectionTimeout]);

  // Health Check Logic
  useEffect(() => {
    let healthCheckInterval: NodeJS.Timeout | null = null;
    let heartbeatTimeout: NodeJS.Timeout | null = null;
    
    const sendHeartbeat = () => {
      if (!subscriptionStates.isSubscribed) return;
      
      if (heartbeatTimeout) {
        clearTimeout(heartbeatTimeout);
      }
      
      // Optimistically update the last event timestamp
      setLastEventTimestamp(Date.now());
      
      // Set a timeout to check if the heartbeat was received
      heartbeatTimeout = setTimeout(() => {
        console.warn('[Realtime] Heartbeat timeout: No events received recently. Triggering potential reconnect.');
        
        // Check if the last event timestamp is older than the heartbeat timeout
        if (lastEventTimestamp && Date.now() - lastEventTimestamp > connectionTimeout) {
          console.warn('[Realtime] Last event was too long ago. Starting periodic reconnect.');
          startPeriodicReconnect();
        } else {
          console.warn('[Realtime] Last event was recent, but still no heartbeat. Continuing to monitor.');
        }
      }, connectionTimeout);
    };
    
    if (subscriptionStates.isSubscribed) {
      console.log('[Realtime] Starting health check interval');
      healthCheckInterval = setInterval(sendHeartbeat, reconnectPeriodicInterval);
    } else {
      console.log('[Realtime] Health check interval stopped');
      if (healthCheckInterval) clearInterval(healthCheckInterval);
      if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
    }
    
    return () => {
      if (healthCheckInterval) clearInterval(healthCheckInterval);
      if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
    };
  }, [subscriptionStates.isSubscribed, lastEventTimestamp, startPeriodicReconnect, connectionTimeout, reconnectPeriodicInterval]);

  useEffect(() => {
    return () => {
      console.log('[Realtime] Disposing of EventDebouncer');
      eventDebouncer.dispose();
    };
  }, []);

  return {
    subscriptionStates,
    handleSubscriptionError,
    isSubscribed: subscriptionStates.isSubscribed,
    lastEventTimestamp,
    connectionError,
    reconnectingFor,
    isForceReconnecting,
    forceReconnect,
  };
};
