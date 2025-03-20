
import { useState, useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { CONNECTION_CONSTANTS } from '@/hooks/supabase-connection/constants';
import { 
  SubscriptionState, 
  SubscriptionStates, 
  ExtendedPayload 
} from './types/subscriptionTypes';
import { createMessageChannel, cleanupChannel } from './utils/subscriptionUtils';
import { useUserRole } from './useUserRole';
import { useEventTracking } from './useEventTracking';
import { useSubscriptionHealth } from './useSubscriptionHealth';
import { useNewMessageHandler } from './useNewMessageHandler';

export const useSubscriptions = (
  channelId: string,
  currentUserId: string | null,
  retryCount: number,
  setRetryCount: (count: number) => void,
  onRealtimeEvent: (payload: ExtendedPayload) => void
) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [subscriptionStates, setSubscriptionStates] = useState<SubscriptionStates>({});
  const userRole = useUserRole();
  const { lastEventTimestamp, trackEvent } = useEventTracking(userRole);
  const { handleNewMessage } = useNewMessageHandler(currentUserId);

  // Health monitoring
  useSubscriptionHealth(
    lastEventTimestamp,
    retryCount,
    setRetryCount,
    channelRef,
    userRole
  );

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

  const handleMessageChange = (payload: any) => {
    const extendedPayload = trackEvent(payload);
    if (!extendedPayload) return;
    
    // Process the payload with the parent component's handler
    onRealtimeEvent(extendedPayload);
    
    // Handle notifications for new messages
    handleNewMessage(extendedPayload, channelId);
  };

  useEffect(() => {
    console.log(`[Chat ${userRole.current}] Setting up subscriptions for channel:`, channelId);
    let isSubscribed = true;

    const setupSubscriptions = async () => {
      if (!channelId) {
        console.log(`[Chat ${userRole.current}] No channel ID provided, skipping subscription setup`);
        return;
      }

      if (channelRef.current) {
        await cleanupChannel(channelRef.current, `Chat ${userRole.current}`);
        channelRef.current = null;
      }

      try {
        const channelName = `chat-${channelId}`;
        console.log(`[Chat ${userRole.current}] Creating new channel with name:`, channelName);
        
        channelRef.current = createMessageChannel(channelId, channelName, (payload) => {
          if (!isSubscribed) return;
          handleMessageChange(payload);
        });

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

    return () => {
      console.log(`[Chat ${userRole.current}] Cleaning up subscriptions`);
      isSubscribed = false;
      
      cleanupChannel(channelRef.current, `Chat ${userRole.current}`);
      channelRef.current = null;
    };
  }, [channelId, currentUserId, onRealtimeEvent, retryCount, setRetryCount]);

  return {
    subscriptionStates,
    handleSubscriptionError,
    isSubscribed: subscriptionStates.messages?.status === 'SUBSCRIBED',
    lastEventTimestamp: lastEventTimestamp.current
  };
};
