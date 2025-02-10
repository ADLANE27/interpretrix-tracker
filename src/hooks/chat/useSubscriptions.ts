
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
  console.log('[Subscriptions] Visibility changed:', document.visibilityState);
  if (document.visibilityState === 'visible') {
    console.log('[Subscriptions] Document became visible, resubscribing...');
    channel.subscribe((status) => {
      console.log('[Subscriptions] Resubscription status:', status);
    });
  } else {
    console.log('[Subscriptions] Document hidden, unsubscribing...');
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
    console.error(`[Subscriptions] Channel error occurred. Retry count: ${retryCount}`);
    
    toast({
      title: "Tentative de reconnexion...",
      description: `Tentative ${retryCount + 1}/${MAX_RETRIES}`,
      variant: "default",
    });
    
    const delay = calculateRetryDelay(retryCount);
    console.log(`[Subscriptions] Scheduling retry in ${delay}ms`);
    
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        console.log('[Subscriptions] Attempting retry...');
        setRetryCount(retryCount + 1);
      } else {
        console.log('[Subscriptions] Document not visible, skipping retry');
      }
    }, delay);
  };

  const subscribeToMessages = () => {
    console.log('[Subscriptions] Setting up real-time subscription for channel:', channelId);
    
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
          console.log('[Subscriptions] Received real-time update:', payload);
          
          if (payload.eventType === 'UPDATE') {
            console.log('[Subscriptions] Message updated, fetching messages...');
            await fetchMessages();
          } else {
            console.log('[Subscriptions] Message created/deleted, fetching messages...');
            await fetchMessages();
          }
          
          if (payload.eventType === 'INSERT' && payload.new.sender_id !== currentUserId) {
            console.log('[Subscriptions] New message from another user, showing notification');
            toast({
              title: "Nouveau message",
              description: "Un nouveau message a été reçu",
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Subscriptions] Subscription status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.error('[Subscriptions] Channel error detected');
          handleSubscriptionError();
        }
        if (status === 'SUBSCRIBED') {
          console.log('[Subscriptions] Successfully subscribed, resetting retry count');
          setRetryCount(0);
          toast({
            title: "Connecté",
            description: "La connexion est rétablie",
            variant: "default",
          });
        }
      });

    // Add visibility change listener
    document.addEventListener('visibilitychange', () => handleVisibilityChange(channel));

    return channel;
  };

  const subscribeToMentions = () => {
    console.log('[Subscriptions] Setting up mentions subscription');
    
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
          console.log('[Subscriptions] Received mention update:', payload);
          if (payload.eventType === 'INSERT' && payload.new.mentioned_user_id === currentUserId) {
            console.log('[Subscriptions] New mention for current user, showing notification');
            toast({
              title: "New Mention",
              description: "You were mentioned in a message",
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Subscriptions] Mentions subscription status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.error('[Subscriptions] Mentions channel error');
          handleSubscriptionError();
        }
      });

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
