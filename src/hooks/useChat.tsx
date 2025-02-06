
import { useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useMessages } from './chat/useMessages';
import { useSubscriptionState } from './chat/useSubscriptionState';
import { useSubscriptions } from './chat/useSubscriptions';
import { useMessageActions } from './chat/useMessageActions';

export const useChat = (channelId: string) => {
  const { 
    messages, 
    isLoading, 
    fetchMessages, 
    setMessages 
  } = useMessages(channelId);

  const {
    isSubscribed,
    setIsSubscribed,
    retryCount,
    setRetryCount,
    currentUserId,
    setCurrentUserId
  } = useSubscriptionState();

  const { subscribeToMessages, subscribeToMentions } = useSubscriptions(
    channelId,
    currentUserId,
    retryCount,
    setRetryCount,
    fetchMessages
  );

  const { sendMessage, deleteMessage, reactToMessage, markMentionsAsRead } = useMessageActions(
    channelId,
    currentUserId,
    fetchMessages
  );

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!channelId) return;
    
    let mentionsChannel;

    const setupSubscriptions = async () => {
      try {
        await fetchMessages();
        subscribeToMessages();
        mentionsChannel = subscribeToMentions();
        setIsSubscribed(true);
        setRetryCount(0);
      } catch (error) {
        console.error('[Chat] Error setting up subscriptions:', error);
      }
    };

    setupSubscriptions();

    return () => {
      if (mentionsChannel) {
        console.log('[Chat] Cleaning up mentions subscription');
        supabase.removeChannel(mentionsChannel);
      }
    };
  }, [channelId]);

  return {
    messages,
    isLoading,
    isSubscribed,
    sendMessage,
    deleteMessage,
    currentUserId,
    reactToMessage,
    markMentionsAsRead,
  };
};
