
import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { CONNECTION_CONSTANTS } from '@/hooks/supabase-connection/constants';
import { eventEmitter, EVENT_UNREAD_MENTIONS_UPDATED, EVENT_NEW_MESSAGE_RECEIVED, EVENT_MENTION_SUGGESTIONS_READY } from '@/lib/events';

interface SubscriptionState {
  status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR',
  error?: Error
}

interface SubscriptionStates {
  messages?: SubscriptionState;
  mentions?: SubscriptionState;
}

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
  const connectionReady = useRef<boolean>(false);

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
          console.log(`[useSubscriptions] User role determined: ${userRole.current}`);
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
    
    // Reset connection flag
    connectionReady.current = false;
    
    if (retryCount < CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS) {
      setTimeout(() => {
        console.log(`[Chat ${userRole.current}] Retrying subscription (attempt ${retryCount + 1})`);
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

      if (channelRef.current) {
        console.log(`[Chat ${userRole.current}] Cleaning up existing channel`);
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      try {
        const channelName = `chat-${channelId}-${instanceId.current}`;
        console.log(`[Chat ${userRole.current}] Creating new channel with name:`, channelName);
        
        channelRef.current = supabase.channel(channelName);

        channelRef.current
          .on('postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'chat_messages',
              filter: `channel_id=eq.${channelId}`
            },
            // Use an async function for the callback to allow await inside
            async (payload: RealtimePostgresChangesPayload<any>) => {
              if (!isSubscribed) return;
              
              const eventId = `${payload.eventType}-${
                payload.eventType === 'DELETE' ? 
                (payload.old as any)?.id : 
                (payload.new as any)?.id
              }-${payload.commit_timestamp}`;
              
              if (seenEvents.current.has(eventId)) {
                console.log(`[Chat ${userRole.current}] Skipping duplicate event:`, eventId);
                return;
              }
              
              seenEvents.current.add(eventId);
              
              if (seenEvents.current.size > 100) {
                const eventsArray = Array.from(seenEvents.current);
                seenEvents.current = new Set(eventsArray.slice(-50));
              }
              
              const extendedPayload: ExtendedPayload = {
                ...payload as any,
                eventType: payload.eventType,
                receivedAt: Date.now()
              };

              lastEventTimestamp.current = extendedPayload.receivedAt;

              console.log(`[Chat ${userRole.current}] Message change received:`, extendedPayload.eventType, extendedPayload);
              
              onRealtimeEvent(extendedPayload);
              
              if (extendedPayload.eventType === 'INSERT' && 
                  extendedPayload.new && 
                  extendedPayload.new.sender_id !== currentUserId) {
                console.log(`[Chat ${userRole.current}] Emitting new message event`, extendedPayload.new);
                
                // Improved mention detection logic
                const mentionContent = extendedPayload.new.content || '';
                const mentionPattern = /@([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)*)/g;
                const matches = [...mentionContent.matchAll(mentionPattern)];
                const userMentioned = matches.some(match => {
                  // Check if the mention is directed at the current user
                  // This would require checking against user profile data
                  // For now, rely on the mentions array from the backend
                  return extendedPayload.new.mentions && 
                         Array.isArray(extendedPayload.new.mentions) && 
                         extendedPayload.new.mentions.includes(currentUserId);
                });
                
                // Check if this is a thread reply to the current user's message
                const isThreadReplyToUser = extendedPayload.new.parent_message_id && 
                  currentUserId && 
                  extendedPayload.new.sender_id !== currentUserId;
                
                let isReplyToUserMessage = false;
                
                // If it's a thread reply, check if the parent message was from the current user
                if (isThreadReplyToUser) {
                  const { data: parentMessage } = await supabase
                    .from('chat_messages')
                    .select('sender_id')
                    .eq('id', extendedPayload.new.parent_message_id)
                    .single();
                    
                  isReplyToUserMessage = Boolean(parentMessage && parentMessage.sender_id === currentUserId);
                  
                  console.log(`[Chat ${userRole.current}] Thread reply check:`, {
                    isReplyToUserMessage,
                    parentSenderId: parentMessage?.sender_id,
                    currentUserId
                  });
                }
                
                console.log(`[Chat ${userRole.current}] User mentioned in message:`, userMentioned, {
                  mentionMatches: matches,
                  mentions: extendedPayload.new.mentions,
                  currentUserId: currentUserId,
                  isThreadReply: isThreadReplyToUser,
                  isReplyToUserMessage
                });
                
                eventEmitter.emit(EVENT_NEW_MESSAGE_RECEIVED, {
                  message: extendedPayload.new,
                  channelId,
                  isMention: userMentioned,
                  isThreadReply: isThreadReplyToUser,
                  isReplyToUserMessage
                });
                
                // Ensure mention suggestions are ready for this new message
                eventEmitter.emit(EVENT_MENTION_SUGGESTIONS_READY, true);
              }
            }
          );

        const channel = await channelRef.current.subscribe((status) => {
          console.log(`[Chat ${userRole.current}] Subscription status:`, status);
          
          if (status === 'SUBSCRIBED') {
            console.log(`[Chat ${userRole.current}] Successfully subscribed to channel:`, channelName);
            connectionReady.current = true;
            setSubscriptionStates({
              messages: { status: 'SUBSCRIBED' },
              ...(currentUserId && { mentions: { status: 'SUBSCRIBED' } })
            });
            
            // Notify that mentions system is ready
            eventEmitter.emit(EVENT_MENTION_SUGGESTIONS_READY, true);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`[Chat ${userRole.current}] Channel error for channel:`, channelName);
            connectionReady.current = false;
            handleSubscriptionError(new Error(`Channel error for ${channelName}`), 'messages');
          }
        });

        console.log(`[Chat ${userRole.current}] Channel subscription initiated:`, channel);
      } catch (error) {
        console.error(`[Chat ${userRole.current}] Error setting up subscriptions:`, error);
        connectionReady.current = false;
        handleSubscriptionError(error as Error, 'messages');
      }
    };

    setupSubscriptions();

    const healthCheckInterval = setInterval(() => {
      const now = Date.now();
      const lastEvent = lastEventTimestamp.current;
      const timeSinceLastEvent = now - lastEvent;
      
      console.log(`[Chat ${userRole.current}] Health check: ${timeSinceLastEvent}ms since last event`);
      
      if (timeSinceLastEvent > CONNECTION_CONSTANTS.HEALTH_CHECK_INTERVAL && channelRef.current) {
        console.log(`[Chat ${userRole.current}] Subscription appears stalled, reconnecting...`);
        connectionReady.current = false;
        setRetryCount(retryCount + 1);
      }
      
      // Send a periodic notification that mention system is ready
      eventEmitter.emit(EVENT_MENTION_SUGGESTIONS_READY, connectionReady.current);
      
    }, CONNECTION_CONSTANTS.CHECK_INTERVAL);

    return () => {
      console.log(`[Chat ${userRole.current}] Cleaning up subscriptions`);
      isSubscribed = false;
      connectionReady.current = false;
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
    lastEventTimestamp: lastEventTimestamp.current,
    connectionReady: connectionReady.current
  };
};
