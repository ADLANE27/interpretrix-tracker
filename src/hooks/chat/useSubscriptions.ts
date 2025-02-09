
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { useRef, useCallback, useState, useEffect } from 'react';

// Constants for reconnection strategy
const INITIAL_RETRY_DELAY = 1000; // Start with 1 second
const MAX_RETRY_DELAY = 15000; // Max 15 seconds between retries
const MAX_SILENT_RETRIES = 5;
const MOBILE_RETRY_MULTIPLIER = 1.5; // Slower backoff for mobile
const MIN_TIME_BETWEEN_TOASTS = 30000; // 30 seconds between error toasts

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
  const lastToastTimeRef = useRef(0);
  const isMobileRef = useRef(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  const isIOSRef = useRef(/iPad|iPhone|iPod/.test(navigator.userAgent));

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

  const shouldShowToast = useCallback(() => {
    const now = Date.now();
    if (now - lastToastTimeRef.current < MIN_TIME_BETWEEN_TOASTS) {
      return false;
    }
    if (silentRetryCountRef.current <= MAX_SILENT_RETRIES) {
      return false;
    }
    if (isBackgroundRef.current) {
      return false;
    }
    lastToastTimeRef.current = now;
    return true;
  }, []);

  const getRetryDelay = useCallback(() => {
    const baseDelay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
      MAX_RETRY_DELAY
    );
    return isMobileRef.current ? baseDelay * MOBILE_RETRY_MULTIPLIER : baseDelay;
  }, [retryCount]);

  const handleConnectionState = useCallback(() => {
    if (!channelRef.current || isBackgroundRef.current) return;

    const online = navigator.onLine;
    console.log('[Chat] Connection state changed:', online ? 'online' : 'offline');

    if (online) {
      console.log('[Chat] Online - attempting to reconnect');
      channelRef.current.subscribe();
    } else {
      console.log('[Chat] Offline - cleaning up channel');
      cleanupChannel();
    }
  }, [cleanupChannel]);

  const handleVisibilityChange = useCallback(() => {
    const isVisible = document.visibilityState === 'visible';
    console.log('[Chat] Visibility changed:', isVisible ? 'visible' : 'hidden');
    
    isBackgroundRef.current = !isVisible;
    lastActiveRef.current = Date.now();
    
    if (isVisible) {
      // For iOS, we force a new subscription when coming back to foreground
      if (isIOSRef.current) {
        console.log('[Chat] iOS detected - forcing channel resubscription');
        cleanupChannel();
        setupChannel();
      } else if (channelRef.current && channelStatus !== 'SUBSCRIBED') {
        console.log('[Chat] Resubscribing to channel');
        channelRef.current.subscribe();
      }
    }
  }, [channelStatus, cleanupChannel]);

  const handleSubscriptionError = useCallback(() => {
    if (isReconnectingRef.current || isBackgroundRef.current) {
      console.log('[Chat] Skipping reconnection - already reconnecting or in background');
      return;
    }
    
    isReconnectingRef.current = true;
    const delay = getRetryDelay();

    console.log(`[Chat] Planning reconnection in ${delay}ms (retry #${retryCount})`);

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    retryTimeoutRef.current = setTimeout(() => {
      if (channelRef.current && !isBackgroundRef.current) {
        console.log('[Chat] Attempting to reconnect...');
        setRetryCount(retryCount + 1);
        silentRetryCountRef.current++;
        
        if (shouldShowToast()) {
          toast({
            title: "Problème de connexion",
            description: "Tentative de reconnexion en cours...",
            variant: "destructive",
          });
        }
        
        channelRef.current.subscribe();
      }
      isReconnectingRef.current = false;
    }, delay);

  }, [retryCount, setRetryCount, toast, getRetryDelay, shouldShowToast]);

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
          
          if (payload.eventType === 'INSERT' && 
              payload.new.sender_id !== currentUserId && 
              !isBackgroundRef.current) {
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
          if (payload.eventType === 'INSERT' && 
              payload.new.mentioned_user_id === currentUserId &&
              !isBackgroundRef.current) {
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
    window.addEventListener('online', handleConnectionState);
    window.addEventListener('offline', handleConnectionState);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleConnectionState);
      window.removeEventListener('offline', handleConnectionState);
    };
  }, [handleVisibilityChange, handleConnectionState]);

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
