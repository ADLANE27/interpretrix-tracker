
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
  const subscriptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [subscriptionStates, setSubscriptionStates] = useState<SubscriptionStates>({});
  const setupInProgressRef = useRef(false);

  const handleSubscriptionError = (error: Error, type: 'messages' | 'mentions') => {
    console.error(`[Chat] ${type} subscription error:`, error);
    setSubscriptionStates(prev => ({
      ...prev,
      [type]: { status: 'CHANNEL_ERROR' as const, error }
    }));
    
    if (retryCount < CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS) {
      // Exponential backoff with randomization to prevent thundering herd
      const delay = Math.min(
        CONNECTION_CONSTANTS.BASE_RECONNECT_DELAY * Math.pow(1.5, retryCount) * (0.9 + Math.random() * 0.2),
        30000 // Max 30 seconds
      );
      
      console.log(`[Chat] Scheduling retry ${retryCount + 1} in ${Math.round(delay)}ms`);
      setTimeout(() => {
        setRetryCount(retryCount + 1);
      }, delay);
    } else {
      console.error('[Chat] Maximum retry attempts reached');
    }
  };

  const setupSubscription = async () => {
    if (!channelId) {
      console.log('[Chat] No channel ID provided, skipping subscription setup');
      return;
    }

    // Prevent multiple setups from running simultaneously
    if (setupInProgressRef.current) {
      console.log('[Chat] Setup already in progress, skipping');
      return;
    }

    setupInProgressRef.current = true;

    try {
      // Clean up existing channel if it exists
      if (channelRef.current) {
        console.log('[Chat] Cleaning up existing channel');
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // Create a new channel with a unique name to prevent conflicts
      const channelName = `chat-${channelId}-${Date.now()}`;
      console.log('[Chat] Creating new channel:', channelName);
      
      channelRef.current = supabase.channel(channelName, {
        config: {
          broadcast: { ack: true, self: true },
          presence: { key: currentUserId || 'anonymous' }
        }
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
            console.log('[Chat] Message change received:', payload);
            await fetchMessages(); // Refresh messages when changes occur
          }
        )
        .on('system', { event: 'disconnect' }, (payload) => {
          console.log('[Chat] Disconnect event:', payload);
          // Let the system reconnect automatically
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channelRef.current?.presenceState();
          console.log('[Chat] Presence state synchronized:', state);
        });

      // Set timeout for subscription
      if (subscriptionTimeoutRef.current) {
        clearTimeout(subscriptionTimeoutRef.current);
      }
      subscriptionTimeoutRef.current = setTimeout(() => {
        console.log('[Chat] Subscription timeout, forcing retry');
        setSubscriptionStates(prev => ({
          ...prev,
          messages: { status: 'TIMED_OUT' as const }
        }));
        setRetryCount(retryCount + 1);
      }, 10000); // 10 second timeout for subscription

      // Subscribe to the channel with proper error handling
      const status = await channelRef.current.subscribe(async (status, err) => {
        console.log('[Chat] Subscription status:', status, err);
        
        if (subscriptionTimeoutRef.current) {
          clearTimeout(subscriptionTimeoutRef.current);
          subscriptionTimeoutRef.current = null;
        }

        if (status === 'SUBSCRIBED') {
          // Track presence after successful subscription
          if (currentUserId && channelRef.current) {
            try {
              await channelRef.current.track({
                user_id: currentUserId,
                online_at: new Date().toISOString()
              });
              console.log('[Chat] User presence tracked for:', currentUserId);
            } catch (presenceError) {
              console.error('[Chat] Error tracking presence:', presenceError);
              // Continue even if presence tracking fails
            }
          }

          // Update subscription states
          setSubscriptionStates({
            messages: { status: 'SUBSCRIBED' },
            ...(currentUserId && { mentions: { status: 'SUBSCRIBED' } })
          });
          
          // Fetch messages immediately after subscribing
          await fetchMessages();
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          handleSubscriptionError(
            err || new Error(`Subscription failed with status: ${status}`),
            'messages'
          );
        }
      });

      console.log('[Chat] Channel subscription initiated with status:', status);
    } catch (error) {
      console.error('[Chat] Error setting up subscriptions:', error);
      handleSubscriptionError(error as Error, 'messages');
    } finally {
      setupInProgressRef.current = false;
    }
  };

  // Set up subscription
  useEffect(() => {
    let mounted = true;
    
    console.log('[Chat] Setting up subscriptions for channel:', channelId, 'currentUserId:', currentUserId, 'retryCount:', retryCount);
    
    if (mounted && channelId) {
      setupSubscription();
    }

    // Cleanup function
    return () => {
      mounted = false;
      if (subscriptionTimeoutRef.current) {
        clearTimeout(subscriptionTimeoutRef.current);
      }
      
      if (channelRef.current) {
        console.log('[Chat] Cleaning up subscriptions');
        supabase.removeChannel(channelRef.current)
          .catch(error => {
            console.error('[Chat] Error removing channel:', error);
          });
        channelRef.current = null;
      }
    };
  }, [channelId, currentUserId, retryCount]);

  return {
    subscriptionStates,
    handleSubscriptionError
  };
};
