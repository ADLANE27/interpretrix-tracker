
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { useRef, useCallback, useState, useEffect } from 'react';

// Constants for reconnection
const INITIAL_RETRY_DELAY = 2000; // 2 seconds
const MAX_RETRY_DELAY = 30000; // 30 seconds
const MAX_SILENT_RETRIES = 3; // Number of retries before showing toast

export const useSubscriptions = (
  channelId: string,
  currentUserId: string | null,
  retryCount: number,
  setRetryCount: (count: number) => void,
  fetchMessages: () => Promise<void>
) => {
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const isReconnectingRef = useRef(false);
  const [channelStatus, setChannelStatus] = useState<REALTIME_SUBSCRIBE_STATES | null>(null);
  const silentRetryCountRef = useRef(0);
  const lastActiveRef = useRef(Date.now());
  const isBackgroundRef = useRef(false);

  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      try {
        console.log('[Chat] Cleaning up channel');
        channelRef.current.unsubscribe();
        channelRef.current = null;
      } catch (error) {
        console.error('[Chat] Error cleaning up channel:', error);
      }
    }
  }, []);

  const handleVisibilityChange = useCallback(() => {
    const isVisible = document.visibilityState === 'visible';
    console.log('[Chat] Visibility changed:', isVisible ? 'visible' : 'hidden');
    
    isBackgroundRef.current = !isVisible;
    
    if (isVisible) {
      lastActiveRef.current = Date.now();
      if (channelStatus !== 'SUBSCRIBED' && channelRef.current) {
        console.log('[Chat] Page visible, resubscribing to channel');
        channelRef.current.subscribe();
      }
    }
  }, [channelStatus]);

  const handleSubscriptionError = useCallback(() => {
    if (isReconnectingRef.current || isBackgroundRef.current) return;
    
    isReconnectingRef.current = true;
    const now = Date.now();
    const timeSinceLastActive = now - lastActiveRef.current;

    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
      MAX_RETRY_DELAY
    );

    console.log(`[Chat] Planning reconnection in ${delay}ms (retry #${retryCount})`);

    retryTimeoutRef.current = setTimeout(() => {
      if (channelRef.current && !isBackgroundRef.current) {
        console.log('[Chat] Attempting to reconnect...');
        setRetryCount(retryCount + 1);
        silentRetryCountRef.current++;
        
        channelRef.current.subscribe();
        
        // Only show toast after MAX_SILENT_RETRIES and if app is active
        if (silentRetryCountRef.current > MAX_SILENT_RETRIES && timeSinceLastActive < 5000) {
          toast({
            title: "Problème de connexion",
            description: "Tentative de reconnexion en cours...",
            variant: "destructive",
          });
        }
      }
      
      isReconnectingRef.current = false;
    }, delay);

  }, [retryCount, setRetryCount, toast]);

  const setupChannel = useCallback(() => {
    console.log('[Chat] Setting up realtime subscription for channel:', channelId);
    
    cleanupChannel();
    
    const channel = supabase
      .channel(`room_${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          console.log('[Chat] Received real-time update:', payload);
          await fetchMessages();
          
          if (payload.eventType === 'INSERT' && payload.new.sender_id !== currentUserId) {
            toast({
              title: "Nouveau message",
              description: "Un nouveau message a été reçu",
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_mentions',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          console.log('[Chat] Received mention update:', payload);
          if (payload.eventType === 'INSERT' && payload.new.mentioned_user_id === currentUserId) {
            toast({
              title: "New Mention",
              description: "You were mentioned in a message",
            });
          }
        }
      )
      .on('system', { event: '*' }, (payload) => {
        console.log('[Chat] System event:', payload);
      })
      .subscribe((status) => {
        console.log('[Chat] Subscription status:', status);
        setChannelStatus(status);
        
        if (status === 'SUBSCRIBED') {
          console.log('[Chat] Successfully subscribed to channel');
          setRetryCount(0);
          silentRetryCountRef.current = 0;
          isReconnectingRef.current = false;
          lastActiveRef.current = Date.now();
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Chat] Channel error occurred');
          handleSubscriptionError();
        }
      });

    channelRef.current = channel;
    lastActiveRef.current = Date.now();

    return () => {
      cleanupChannel();
    };
  }, [channelId, currentUserId, fetchMessages, handleSubscriptionError, setRetryCount, cleanupChannel, toast]);

  useEffect(() => {
    console.log('[Chat] Setting up visibility change listener');
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  useEffect(() => {
    if (channelId) {
      return setupChannel();
    }
  }, [channelId, setupChannel]);

  return {
    channelStatus,
    cleanup: useCallback(() => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      cleanupChannel();
    }, [cleanupChannel])
  };
};
