
import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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

  const handleSubscriptionError = (error: Error, type: 'messages' | 'mentions') => {
    console.error(`[Chat] ${type} subscription error:`, error);
    setSubscriptionStates(prev => ({
      ...prev,
      [type]: { status: 'CHANNEL_ERROR' as const, error }
    }));
    
    if (retryCount < 3) {
      setTimeout(() => {
        setRetryCount(retryCount + 1);
      }, 1000 * Math.pow(2, retryCount)); // Exponential backoff
    }
  };

  const subscribeToMessages = () => {
    if (!channelRef.current) return;
    
    channelRef.current
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`
        },
        async (payload) => {
          console.log('[Chat] Message change received:', payload);
          await fetchMessages();
        }
      )
      .subscribe((status) => {
        console.log('[Chat] Messages subscription status:', status);
        setSubscriptionStates(prev => ({
          ...prev,
          messages: { status: 'SUBSCRIBED' as const }
        }));
      });
  };

  const subscribeToMentions = () => {
    if (!channelRef.current || !currentUserId) return;
    
    channelRef.current
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_mentions',
          filter: `channel_id=eq.${channelId}`
        },
        async (payload) => {
          console.log('[Chat] Mention change received:', payload);
          await fetchMessages();
        }
      )
      .subscribe((status) => {
        console.log('[Chat] Mentions subscription status:', status);
        setSubscriptionStates(prev => ({
          ...prev,
          mentions: { status: 'SUBSCRIBED' as const }
        }));
      });
  };

  useEffect(() => {
    if (!channelId) return;

    const channel = supabase.channel(`chat-${channelId}`);
    channelRef.current = channel;

    subscribeToMessages();
    subscribeToMentions();

    return () => {
      if (channelRef.current) {
        console.log('[Chat] Cleaning up subscriptions');
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [channelId, currentUserId, retryCount]);

  return {
    subscriptionStates,
    handleSubscriptionError,
    subscribeToMessages,
    subscribeToMentions
  };
};
