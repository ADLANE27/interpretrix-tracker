import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

const MAX_RETRIES = 3;

export const useSubscriptions = (
  channelId: string,
  currentUserId: string | null,
  retryCount: number,
  setRetryCount: (count: number) => void,
  fetchMessages: () => Promise<void>
) => {
  const { toast } = useToast();

  const handleSubscriptionError = () => {
    if (retryCount < MAX_RETRIES) {
      const timeout = Math.min(1000 * Math.pow(2, retryCount), 10000);
      setTimeout(() => {
        setRetryCount(retryCount + 1);
      }, timeout);
    } else {
      toast({
        title: "Erreur de connexion",
        description: "Impossible de se connecter au chat. Veuillez rafraîchir la page.",
        variant: "destructive",
      });
    }
  };

  const subscribeToMessages = () => {
    console.log('[Chat] Setting up real-time subscription for channel:', channelId);
    
    return supabase
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
            // Handle message updates (reactions)
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
      });
  };

  const subscribeToMentions = () => {
    console.log('[Chat] Setting up mentions subscription');
    
    return supabase
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
  };

  return {
    handleSubscriptionError,
    subscribeToMessages,
    subscribeToMentions,
  };
};