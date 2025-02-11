
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from './useRealtimeSubscription';

export const useSubscriptions = (
  channelId: string,
  currentUserId: string | null,
  retryCount: number,
  setRetryCount: (count: number) => void,
  fetchMessages: () => Promise<void>
) => {
  const { toast } = useToast();

  const handleSubscriptionError = useCallback(() => {
    toast({
      title: "Problème de connexion",
      description: "Tentative de reconnexion en cours...",
      variant: "destructive",
    });
    setRetryCount(retryCount + 1);
  }, [retryCount, setRetryCount, toast]);

  const subscribeToMessages = useCallback(() => {
    console.log('[Chat] Setting up real-time subscription for channel:', channelId);
    
    const { isConnected, error } = useRealtimeSubscription({
      channelName: `messages:${channelId}`,
      tableToWatch: 'chat_messages',
      filter: 'channel_id',
      filterValue: channelId,
    });

    if (!isConnected && error) {
      handleSubscriptionError();
    }

    // Return a dummy channel for backward compatibility
    return supabase.channel(`messages:${channelId}`);
  }, [channelId, handleSubscriptionError]);

  const subscribeToMentions = useCallback(() => {
    console.log('[Chat] Setting up mentions subscription');
    
    const { isConnected, error } = useRealtimeSubscription({
      channelName: `mentions:${channelId}`,
      tableToWatch: 'message_mentions',
      filter: 'channel_id',
      filterValue: channelId,
    });

    if (!isConnected && error) {
      handleSubscriptionError();
    }

    // Return a dummy channel for backward compatibility
    return supabase.channel(`mentions:${channelId}`);
  }, [channelId, handleSubscriptionError]);

  return {
    handleSubscriptionError,
    subscribeToMessages,
    subscribeToMentions,
  };
};
