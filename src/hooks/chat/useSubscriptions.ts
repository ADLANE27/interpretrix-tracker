
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useRef, useCallback, useState } from 'react';

const RETRY_DELAY = 2000; // 2 secondes entre les tentatives

export const useSubscriptions = (
  channelId: string,
  currentUserId: string | null,
  retryCount: number,
  setRetryCount: (count: number) => void,
  fetchMessages: () => Promise<void>
) => {
  const { toast } = useToast();
  const messageChannelRef = useRef<RealtimeChannel | null>(null);
  const mentionChannelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const isReconnectingRef = useRef(false);
  const [messageChannelStatus, setMessageChannelStatus] = useState<'SUBSCRIBED' | 'CHANNEL_ERROR' | 'CLOSED' | null>(null);
  const [mentionChannelStatus, setMentionChannelStatus] = useState<'SUBSCRIBED' | 'CHANNEL_ERROR' | 'CLOSED' | null>(null);

  const cleanupChannel = useCallback((channel: RealtimeChannel | null) => {
    if (channel) {
      try {
        channel.unsubscribe();
      } catch (error) {
        console.error('[Chat] Error cleaning up channel:', error);
      }
    }
  }, []);

  const handleVisibilityChange = useCallback((channel: RealtimeChannel | null, status: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'CLOSED' | null) => {
    if (!channel) return;

    if (document.visibilityState === 'visible' && status !== 'SUBSCRIBED') {
      console.log('[Chat] Page visible, resubscribing to channel');
      channel.subscribe();
    }
  }, []);

  const setupVisibilityListener = useCallback((channel: RealtimeChannel, type: 'messages' | 'mentions') => {
    const listener = () => {
      if (type === 'messages') {
        handleVisibilityChange(channel, messageChannelStatus);
      } else {
        handleVisibilityChange(channel, mentionChannelStatus);
      }
    };
    
    document.addEventListener('visibilitychange', listener);
    
    return () => {
      document.removeEventListener('visibilitychange', listener);
    };
  }, [handleVisibilityChange, messageChannelStatus, mentionChannelStatus]);

  const handleSubscriptionError = useCallback(() => {
    if (isReconnectingRef.current) return;
    isReconnectingRef.current = true;

    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    // Exponential backoff for retries
    const delay = Math.min(RETRY_DELAY * Math.pow(2, retryCount), 30000);

    retryTimeoutRef.current = setTimeout(() => {
      console.log('[Chat] Attempting to reconnect...');
      setRetryCount(retryCount + 1);
      
      // Réessayer de se connecter
      if (messageChannelRef.current) {
        messageChannelRef.current.subscribe();
      }
      if (mentionChannelRef.current) {
        mentionChannelRef.current.subscribe();
      }
      
      isReconnectingRef.current = false;
    }, delay);

    // Only show toast on first error
    if (retryCount === 0) {
      toast({
        title: "Problème de connexion",
        description: "Tentative de reconnexion en cours...",
        variant: "destructive",
      });
    }
  }, [retryCount, setRetryCount, toast]);

  const subscribeToMessages = useCallback(() => {
    console.log('[Chat] Setting up real-time subscription for channel:', channelId);
    
    // Cleanup existing channel if any
    cleanupChannel(messageChannelRef.current);
    
    const channel = supabase
      .channel(`messages:${channelId}`)
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
      .subscribe((status) => {
        console.log('[Chat] Subscription status:', status);
        setMessageChannelStatus(status);
        if (status === 'SUBSCRIBED') {
          console.log('[Chat] Successfully subscribed to messages');
          setRetryCount(0);
          isReconnectingRef.current = false;
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Chat] Channel error occurred');
          handleSubscriptionError();
        }
      });

    messageChannelRef.current = channel;
    const cleanup = setupVisibilityListener(channel, 'messages');

    return () => {
      cleanup();
      cleanupChannel(channel);
    };
  }, [channelId, currentUserId, fetchMessages, handleSubscriptionError, setRetryCount, setupVisibilityListener, cleanupChannel, toast]);

  const subscribeToMentions = useCallback(() => {
    console.log('[Chat] Setting up mentions subscription');
    
    // Cleanup existing channel if any
    cleanupChannel(mentionChannelRef.current);
    
    const channel = supabase
      .channel(`mentions:${channelId}`)
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
      .subscribe((status) => {
        console.log('[Chat] Mentions subscription status:', status);
        setMentionChannelStatus(status);
        if (status === 'CHANNEL_ERROR') {
          handleSubscriptionError();
        }
      });

    mentionChannelRef.current = channel;
    const cleanup = setupVisibilityListener(channel, 'mentions');

    return () => {
      cleanup();
      cleanupChannel(channel);
    };
  }, [channelId, currentUserId, handleSubscriptionError, setupVisibilityListener, cleanupChannel, toast]);

  return {
    handleSubscriptionError,
    subscribeToMessages,
    subscribeToMentions,
    cleanup: useCallback(() => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      cleanupChannel(messageChannelRef.current);
      cleanupChannel(mentionChannelRef.current);
      messageChannelRef.current = null;
      mentionChannelRef.current = null;
    }, [cleanupChannel])
  };
};
