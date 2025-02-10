
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

// Progressive retry with exponential backoff
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const MAX_RETRIES = 5;

const calculateRetryDelay = (retryCount: number) => {
  const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
  return Math.min(delay, MAX_RETRY_DELAY);
};

// Remove retry limit for better iOS PWA support
const handleVisibilityChange = (channel: RealtimeChannel) => {
  if (document.visibilityState === 'visible') {
    channel.subscribe();
  } else {
    channel.unsubscribe();
  }
};

export const useSubscriptions = (
  channelId: string,
  currentUserId: string | null,
  retryCount: number,
  setRetryCount: (count: number) => void,
  fetchMessages: () => Promise<void>
) => {
  const { toast } = useToast();

  const handleSubscriptionError = () => {
    const delay = calculateRetryDelay(retryCount);
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        setRetryCount(retryCount + 1);
      }
    }, delay);
  };

  const subscribeToMessages = () => {
    console.log('[Chat] Setting up real-time subscription for channel:', channelId);
    
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
          
          if (payload.eventType === 'UPDATE') {
            await fetchMessages();
          } else {
            await fetchMessages();
          }
          
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
        if (status === 'CHANNEL_ERROR') {
          handleSubscriptionError();
        }
        if (status === 'SUBSCRIBED') {
          setRetryCount(0); // Reset retry count on successful connection
        }
      });

    // Add visibility change listener
    document.addEventListener('visibilitychange', () => handleVisibilityChange(channel));

    return channel;
  };

  const subscribeToMentions = () => {
    console.log('[Chat] Setting up mentions subscription');
    
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
      .subscribe();

    // Add visibility change listener
    document.addEventListener('visibilitychange', () => handleVisibilityChange(channel));

    return channel;
  };

  return {
    handleSubscriptionError,
    subscribeToMessages,
    subscribeToMentions,
  };
};
