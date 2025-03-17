
import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { CONNECTION_CONSTANTS } from '@/hooks/supabase-connection/constants';

interface SubscriptionState {
  status: 'SUBSCRIBED' | 'CONNECTING' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR',
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
  const messageChannelRef = useRef<RealtimeChannel | null>(null);
  const mentionChannelRef = useRef<RealtimeChannel | null>(null);
  const [subscriptionStates, setSubscriptionStates] = useState<SubscriptionStates>({});
  const lastMessageRef = useRef<string | null>(null);

  const handleSubscriptionError = (error: Error, type: 'messages' | 'mentions') => {
    console.error(`[Chat] ${type} subscription error:`, error);
    setSubscriptionStates(prev => ({
      ...prev,
      [type]: { status: 'CHANNEL_ERROR' as const, error }
    }));
    
    if (retryCount < CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS) {
      const delay = CONNECTION_CONSTANTS.BASE_RECONNECT_DELAY * Math.pow(2, retryCount);
      console.log(`[Chat] Retrying in ${delay}ms (attempt ${retryCount + 1}/${CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS})`);
      
      setTimeout(() => {
        setRetryCount(retryCount + 1);
      }, delay);
    } else {
      console.error(`[Chat] Max retry attempts (${CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
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

      // Set status to connecting
      setSubscriptionStates(prev => ({
        ...prev,
        messages: { status: 'CONNECTING' },
        ...(currentUserId && { mentions: { status: 'CONNECTING' } })
      }));

      // Clean up existing channels if they exist
      if (channelRef.current) {
        console.log('[Chat] Cleaning up existing channel');
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      if (messageChannelRef.current) {
        await supabase.removeChannel(messageChannelRef.current);
        messageChannelRef.current = null;
      }
      
      if (mentionChannelRef.current) {
        await supabase.removeChannel(mentionChannelRef.current);
        mentionChannelRef.current = null;
      }

      try {
        // Create a new channel with a unique name for messages
        const messageChannelName = `chat-messages-${channelId}-${Date.now()}`;
        console.log('[Chat] Creating new message channel:', messageChannelName);
        
        messageChannelRef.current = supabase.channel(messageChannelName);

        // Set up message changes subscription with explicit event types
        messageChannelRef.current
          .on('postgres_changes',
            {
              event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
              schema: 'public',
              table: 'chat_messages',
              filter: `channel_id=eq.${channelId}`
            },
            async (payload) => {
              if (!isSubscribed) return;
              
              // Deduplicate messages by tracking the last message ID
              if (payload.eventType === 'INSERT' && payload.new && payload.new.id === lastMessageRef.current) {
                console.log('[Chat] Ignoring duplicate message:', payload.new.id);
                return;
              }
              
              if (payload.eventType === 'INSERT' && payload.new) {
                lastMessageRef.current = payload.new.id;
              }
              
              console.log('[Chat] Message change received:', payload);
              await fetchMessages();
            }
          );

        // Subscribe to the messages channel
        const messagesSubscription = await messageChannelRef.current.subscribe((status) => {
          console.log('[Chat] Message subscription status:', status);
          if (status === 'SUBSCRIBED') {
            setSubscriptionStates(prev => ({
              ...prev,
              messages: { status: 'SUBSCRIBED' }
            }));
          } else if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setSubscriptionStates(prev => ({
              ...prev,
              messages: { status: status as SubscriptionState['status'] }
            }));
            
            if (status === 'CHANNEL_ERROR' && retryCount < CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS) {
              setRetryCount(retryCount + 1);
            }
          }
        });

        console.log('[Chat] Message channel subscribed:', messagesSubscription);

        // If user is logged in, also subscribe to mentions
        if (currentUserId) {
          const mentionChannelName = `chat-mentions-${channelId}-${currentUserId}-${Date.now()}`;
          console.log('[Chat] Creating new mention channel:', mentionChannelName);
          
          mentionChannelRef.current = supabase.channel(mentionChannelName);
          
          mentionChannelRef.current
            .on('postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'message_mentions',
                filter: `mentioned_user_id=eq.${currentUserId}`
              },
              async (payload) => {
                if (!isSubscribed) return;
                console.log('[Chat] Mention received:', payload);
              }
            );
            
          const mentionSubscription = await mentionChannelRef.current.subscribe((status) => {
            console.log('[Chat] Mention subscription status:', status);
            if (status === 'SUBSCRIBED') {
              setSubscriptionStates(prev => ({
                ...prev,
                mentions: { status: 'SUBSCRIBED' }
              }));
            } else if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              setSubscriptionStates(prev => ({
                ...prev,
                mentions: { status: status as SubscriptionState['status'] }
              }));
              
              if (status === 'CHANNEL_ERROR' && retryCount < CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS) {
                setRetryCount(retryCount + 1);
              }
            }
          });
          
          console.log('[Chat] Mention channel subscribed:', mentionSubscription);
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
      
      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current)
          .catch(error => {
            console.error('[Chat] Error removing message channel:', error);
          });
        messageChannelRef.current = null;
      }
      
      if (mentionChannelRef.current) {
        supabase.removeChannel(mentionChannelRef.current)
          .catch(error => {
            console.error('[Chat] Error removing mention channel:', error);
          });
        mentionChannelRef.current = null;
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
