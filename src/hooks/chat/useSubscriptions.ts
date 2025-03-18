
import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
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

export const useSubscriptions = (
  channelId: string,
  currentUserId: string | null,
  retryCount: number,
  setRetryCount: (count: number) => void,
  fetchMessages: () => Promise<void>
) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [subscriptionStates, setSubscriptionStates] = useState<SubscriptionStates>({});
  const lastProcessedEventRef = useRef<{id?: string; timestamp?: number}>({});
  // Debounce mechanism to prevent multiple consecutive fetches
  const fetchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Debounced fetch function to prevent multiple fetches in quick succession
  const debouncedFetchMessages = () => {
    if (fetchDebounceTimerRef.current) {
      clearTimeout(fetchDebounceTimerRef.current);
    }
    
    fetchDebounceTimerRef.current = setTimeout(() => {
      fetchMessages();
      fetchDebounceTimerRef.current = null;
    }, 300); // 300ms debounce time
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
        // Create a new channel with a unique name
        const channelName = `chat-${channelId}-${Date.now()}`;
        console.log('[Chat] Creating new channel:', channelName);
        
        channelRef.current = supabase.channel(channelName);

        // Set up message changes subscription with explicit event types
        channelRef.current
          .on('postgres_changes',
            {
              event: 'INSERT', // Only listen for new messages
              schema: 'public',
              table: 'chat_messages',
              filter: `channel_id=eq.${channelId}`
            },
            (payload) => {
              if (!isSubscribed) return;
              
              // Check for duplicate events
              const eventId = payload.new?.id;
              const currentTime = Date.now();
              
              // Skip if we've already processed this event recently
              if (eventId === lastProcessedEventRef.current.id && 
                  lastProcessedEventRef.current.timestamp && 
                  currentTime - lastProcessedEventRef.current.timestamp < 2000) {
                console.log('[Chat] Skipping duplicate event:', eventId);
                return;
              }
              
              // Update last processed event
              lastProcessedEventRef.current = {
                id: eventId,
                timestamp: currentTime
              };
              
              console.log('[Chat] New message received:', payload);
              debouncedFetchMessages();
            }
          )
          // Handle message updates separately
          .on('postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'chat_messages',
              filter: `channel_id=eq.${channelId}`
            },
            (payload) => {
              if (!isSubscribed) return;
              console.log('[Chat] Message update received:', payload);
              debouncedFetchMessages();
            }
          )
          // Handle message deletions separately
          .on('postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'chat_messages',
              filter: `channel_id=eq.${channelId}`
            },
            (payload) => {
              if (!isSubscribed) return;
              console.log('[Chat] Message deletion received:', payload);
              debouncedFetchMessages();
            }
          );

        // Subscribe to the channel
        channelRef.current.subscribe((status) => {
          console.log('[Chat] Subscription status:', status);
          setSubscriptionStates(prev => ({
            ...prev,
            messages: { status: status as any }
          }));
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
      
      if (fetchDebounceTimerRef.current) {
        clearTimeout(fetchDebounceTimerRef.current);
        fetchDebounceTimerRef.current = null;
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
