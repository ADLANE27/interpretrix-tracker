
import { useRef, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useToast } from "@/hooks/use-toast";
import { eventEmitter, EVENT_NEW_MESSAGE_RECEIVED } from '@/lib/events';
import { CONNECTION_CONSTANTS } from '@/hooks/supabase-connection/constants';

interface SubscriptionState {
  status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR' | 'CONNECTING';
  error?: Error;
}

export const useOptimizedChatSubscription = (
  channelId: string,
  currentUserId: string | null,
  userRole: 'admin' | 'interpreter' = 'admin'
) => {
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>({ status: 'CONNECTING' });
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastEventTimestamp = useRef<number>(Date.now());
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const seenEventsRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();
  const instanceId = useRef<string>(`${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  const isUnmountingRef = useRef(false);
  const hasPerformedInitialSubscription = useRef(false);
  const stalledTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Store connection state in sessionStorage to persist across page navigations
  useEffect(() => {
    const storeConnectionState = (state: SubscriptionState) => {
      if (isUnmountingRef.current) return;
      try {
        sessionStorage.setItem(`chat-subscription-${channelId}-state`, JSON.stringify(state));
      } catch (error) {
        console.error(`[Chat ${userRole}] Error storing connection state:`, error);
      }
    };

    const loadConnectionState = (): SubscriptionState | null => {
      try {
        const state = sessionStorage.getItem(`chat-subscription-${channelId}-state`);
        return state ? JSON.parse(state) : null;
      } catch (error) {
        console.error(`[Chat ${userRole}] Error loading connection state:`, error);
        return null;
      }
    };

    // Initial load of connection state
    const savedState = loadConnectionState();
    if (savedState && savedState.status === 'SUBSCRIBED') {
      setSubscriptionState(savedState);
    }

    return () => {
      isUnmountingRef.current = true;
    };
  }, [channelId, userRole]);

  // Function to handle incoming events
  const handleRealtimeEvent = useCallback(async (payload: RealtimePostgresChangesPayload<any>) => {
    // Update last event timestamp
    lastEventTimestamp.current = Date.now();
    
    // Generate a unique event ID to prevent duplicate processing
    const eventId = `${payload.eventType}-${
      payload.eventType === 'DELETE' ? 
      (payload.old as any)?.id : 
      (payload.new as any)?.id
    }-${payload.commit_timestamp}`;
    
    // Avoid duplicate event processing
    if (seenEventsRef.current.has(eventId)) {
      console.log(`[Chat ${userRole}] Skipping duplicate event:`, eventId);
      return;
    }
    
    // Add to seen events and limit collection size
    seenEventsRef.current.add(eventId);
    if (seenEventsRef.current.size > 100) {
      const eventsArray = Array.from(seenEventsRef.current);
      seenEventsRef.current = new Set(eventsArray.slice(-50));
    }
    
    const extendedPayload = {
      ...payload,
      receivedAt: Date.now()
    };

    console.log(`[Chat ${userRole}] Message change received:`, extendedPayload.eventType);
    
    if (extendedPayload.eventType === 'INSERT' && 
        extendedPayload.new && 
        extendedPayload.new.sender_id !== currentUserId) {
        
      // Check for mentions
      const userMentioned = Boolean(
        extendedPayload.new.mentions && 
        Array.isArray(extendedPayload.new.mentions) && 
        extendedPayload.new.mentions.includes(currentUserId)
      );
      
      // Check for thread replies
      let isThreadReplyToUserMessage = false;
      const isThreadReply = Boolean(extendedPayload.new.parent_message_id);
      
      if (isThreadReply && currentUserId) {
        try {
          const { data: parentMessage } = await supabase
            .from('chat_messages')
            .select('sender_id')
            .eq('id', extendedPayload.new.parent_message_id)
            .single();
            
          isThreadReplyToUserMessage = Boolean(parentMessage && parentMessage.sender_id === currentUserId);
        } catch (error) {
          console.error(`[Chat ${userRole}] Error checking parent message:`, error);
        }
      }
      
      // Emit new message event
      eventEmitter.emit(EVENT_NEW_MESSAGE_RECEIVED, {
        message: extendedPayload.new,
        channelId,
        isMention: userMentioned,
        isThreadReply,
        isReplyToUserMessage: isThreadReplyToUserMessage
      });
    }
    
    return extendedPayload;
  }, [channelId, currentUserId, userRole]);

  // Setup subscription
  const setupSubscription = useCallback(() => {
    if (!channelId || isUnmountingRef.current) {
      return;
    }

    if (channelRef.current) {
      console.log(`[Chat ${userRole}] Removing existing channel before creating new one`);
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    try {
      console.log(`[Chat ${userRole}] Creating new subscription for channel: ${channelId}`);
      setSubscriptionState({ status: 'CONNECTING' });

      const channelName = `chat-${channelId}-${instanceId.current}`;
      channelRef.current = supabase.channel(channelName);

      // Configure the channel to listen for message changes
      channelRef.current
        .on('postgres_changes', 
            {
              event: '*',
              schema: 'public',
              table: 'chat_messages',
              filter: `channel_id=eq.${channelId}`
            },
            handleRealtimeEvent
        )
        .subscribe((status) => {
          console.log(`[Chat ${userRole}] Subscription status:`, status);
          
          if (status === 'SUBSCRIBED') {
            const newState = { status: 'SUBSCRIBED' as const };
            setSubscriptionState(newState);
            setReconnectAttempt(0);
            
            // Store in session storage
            sessionStorage.setItem(`chat-subscription-${channelId}-state`, JSON.stringify(newState));
            lastEventTimestamp.current = Date.now();
            
            // Set flag indicating we've successfully subscribed once
            hasPerformedInitialSubscription.current = true;
          } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            setSubscriptionState({ status: status as any, error: new Error(`Subscription ${status}`) });
            
            // Only attempt reconnect if component is still mounted
            if (!isUnmountingRef.current && hasPerformedInitialSubscription.current) {
              scheduleReconnect();
            }
          }
        });

      return channelRef.current;
    } catch (error) {
      console.error(`[Chat ${userRole}] Error setting up subscription:`, error);
      setSubscriptionState({ status: 'CHANNEL_ERROR', error: error as Error });
      
      // Schedule reconnection attempt
      scheduleReconnect();
      return null;
    }
  }, [channelId, handleRealtimeEvent, userRole]);

  // Function to schedule reconnection
  const scheduleReconnect = useCallback(() => {
    if (isUnmountingRef.current) return;
    
    const nextAttempt = reconnectAttempt + 1;
    if (nextAttempt <= CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(
        CONNECTION_CONSTANTS.BASE_RECONNECT_DELAY * Math.pow(1.5, reconnectAttempt),
        30000
      );
      
      console.log(`[Chat ${userRole}] Scheduling reconnection attempt ${nextAttempt} in ${delay}ms`);
      setTimeout(() => {
        if (!isUnmountingRef.current) {
          setReconnectAttempt(nextAttempt);
          setupSubscription();
        }
      }, delay);
    } else {
      console.log(`[Chat ${userRole}] Max reconnection attempts (${CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS}) reached`);
      toast({
        title: "Problème de connexion",
        description: "La connexion temps réel a été perdue. Essayez de rafraîchir la page.",
        variant: "destructive",
        duration: 10000,
      });
    }
  }, [reconnectAttempt, setupSubscription, toast, userRole]);

  // Set up health check for the connection
  useEffect(() => {
    if (!channelId || isUnmountingRef.current) return;

    const setupHealthCheck = () => {
      // Clear any existing intervals
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
      
      // Clear any existing stalled timeouts
      if (stalledTimeoutRef.current) {
        clearTimeout(stalledTimeoutRef.current);
      }
      
      // More lenient health check interval: 60s instead of 30s
      healthCheckIntervalRef.current = setInterval(() => {
        if (isUnmountingRef.current) return;
        
        const now = Date.now();
        const timeSinceLastEvent = now - lastEventTimestamp.current;
        console.log(`[Chat ${userRole}] Health check: ${timeSinceLastEvent}ms since last event`);
        
        // Only consider stalled after 5 minutes (300s) with no events
        if (timeSinceLastEvent > 300000 && channelRef.current && subscriptionState.status === 'SUBSCRIBED') {
          console.log(`[Chat ${userRole}] Connection may be stalled, scheduling check...`);
          
          // Set a timeout to verify if we're truly stalled
          stalledTimeoutRef.current = setTimeout(() => {
            if (isUnmountingRef.current) return;
            
            // Check if we've received any events since scheduling this check
            const currentTimeSinceLastEvent = Date.now() - lastEventTimestamp.current;
            if (currentTimeSinceLastEvent > 360000) { // 6 minutes
              console.log(`[Chat ${userRole}] Subscription appears stalled, reconnecting...`);
              setupSubscription();
            } else {
              console.log(`[Chat ${userRole}] False alarm, connection is still active`);
            }
          }, 60000); // Wait another minute before triggering reconnect
        }
      }, 60000); // Check every minute instead of every 30s
    };

    setupHealthCheck();

    // Clean up on unmount
    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
      if (stalledTimeoutRef.current) {
        clearTimeout(stalledTimeoutRef.current);
      }
    };
  }, [channelId, setupSubscription, subscriptionState.status, userRole]);

  // Set up initial subscription when component mounts
  useEffect(() => {
    if (!channelId) return;
    console.log(`[Chat ${userRole}] Setting up initial subscription for channel: ${channelId}`);
    
    const channel = setupSubscription();
    
    // Clean up on unmount
    return () => {
      console.log(`[Chat ${userRole}] Cleaning up subscription for channel: ${channelId}`);
      isUnmountingRef.current = true;
      
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
      
      if (stalledTimeoutRef.current) {
        clearTimeout(stalledTimeoutRef.current);
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelId, setupSubscription, userRole]);

  // Handle visibility change events
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log(`[Chat ${userRole}] Page became visible, checking subscription`);
        
        // Update last event timestamp to prevent immediate reconnection
        lastEventTimestamp.current = Date.now();
        
        // Check subscription state only after the page has been visible for a moment
        setTimeout(() => {
          if (isUnmountingRef.current) return;
          
          // Only reconnect if we've previously had a successful connection
          if (hasPerformedInitialSubscription.current && 
              (!channelRef.current || subscriptionState.status !== 'SUBSCRIBED')) {
            console.log(`[Chat ${userRole}] Reestablishing subscription after tab focus`);
            setupSubscription();
          }
        }, 1000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setupSubscription, subscriptionState.status, userRole]);

  // A function to force reconnection
  const forceReconnect = useCallback(() => {
    console.log(`[Chat ${userRole}] Force reconnecting...`);
    setReconnectAttempt(0);
    lastEventTimestamp.current = Date.now();
    setupSubscription();
  }, [setupSubscription, userRole]);

  return {
    isSubscribed: subscriptionState.status === 'SUBSCRIBED',
    subscriptionState,
    forceReconnect,
    lastEventTimestamp: lastEventTimestamp.current
  };
};
