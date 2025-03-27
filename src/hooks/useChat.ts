
import { useState } from 'react';
import { useCurrentUser } from './chat/useCurrentUser';
import { useChatMessages } from './chat/useChatMessages';
import { useSubscriptions } from './chat/useSubscriptions';
import { useMessageActions } from './chat/useMessageActions';
import { useMessageOptimisticUpdates } from './chat/useMessageOptimisticUpdates';
import { useMessageFormatter } from './chat/useMessageFormatter';

export const useChat = (channelId: string) => {
  const [retryCount, setRetryCount] = useState(0);
  const { currentUserId } = useCurrentUser();
  const { formatMessage } = useMessageFormatter();
  
  const {
    messages,
    isLoading,
    handleRealtimeMessage,
    fetchMessages,
    forceFetch,
    loadMoreMessages,
    hasMoreMessages,
    setMessages,
    messagesMap
  } = useChatMessages(channelId);

  const { 
    subscriptionStates, 
    handleSubscriptionError,
    isSubscribed,
    lastEventTimestamp
  } = useSubscriptions(
    channelId,
    currentUserId,
    retryCount,
    setRetryCount,
    handleRealtimeMessage
  );

  const { 
    sendMessage,
    deleteMessage: deleteMessageApi,
    reactToMessage,
    markMentionsAsRead,
  } = useMessageActions(
    channelId,
    currentUserId,
    fetchMessages
  );

  const { handleDeleteMessage } = useMessageOptimisticUpdates(
    messagesMap,
    setMessages,
    fetchMessages,
    deleteMessageApi
  );

  return {
    messages,
    isLoading,
    isSubscribed,
    subscriptionStatus: subscriptionStates,
    sendMessage,
    deleteMessage: handleDeleteMessage,
    currentUserId,
    reactToMessage,
    markMentionsAsRead,
    forceFetch,
    loadMoreMessages,
    hasMoreMessages
  };
};
