
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useChatMessages } from './chat/useChatMessages';
import { useSubscriptions } from './chat/useSubscriptions';
import { useMessageActions } from './chat/useMessageActions';
import { useMessageHandlers } from './chat/useMessageHandlers';

export const useChat = (channelId: string) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState<boolean>(window.navigator.onLine);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    messages: boolean;
  }>({ messages: false });
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMoreMessages,
    loadMoreMessages,
    fetchMessages,
    formatSingleMessage,
    addMessage,
    updateMessage,
    removeMessage,
    channelTypeRef
  } = useChatMessages(channelId);

  const {
    handleNewMessage,
    handleMessageUpdate,
    handleMessageDelete
  } = useMessageHandlers(
    formatSingleMessage,
    addMessage,
    updateMessage,
    removeMessage,
    messages,
    channelTypeRef
  );

  const { 
    subscriptionStates, 
    handleSubscriptionError 
  } = useSubscriptions(
    channelId,
    currentUserId,
    retryCount,
    setRetryCount,
    handleNewMessage,
    handleMessageUpdate,
    handleMessageDelete
  );

  const { 
    sendMessage,
    deleteMessage: handleDeleteMessage,
    reactToMessage,
    markMentionsAsRead,
    connectionStatus
  } = useMessageActions(
    channelId,
    currentUserId,
    fetchMessages
  );

  // Fetch current user on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Fetch messages when channel changes
  useEffect(() => {
    if (channelId) {
      console.log('[Chat] Initial messages fetch for channel:', channelId);
      fetchMessages(true);
    }
  }, [channelId, fetchMessages]);

  // Update subscription status from the subscription states
  useEffect(() => {
    setSubscriptionStatus({
      messages: subscriptionStates.messages?.status === 'SUBSCRIBED' && isOnline
    });
  }, [subscriptionStates, isOnline]);

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMoreMessages,
    loadMoreMessages,
    isSubscribed: subscriptionStatus.messages,
    subscriptionStatus,
    sendMessage,
    deleteMessage: handleDeleteMessage,
    currentUserId,
    reactToMessage,
    markMentionsAsRead,
    isOnline,
  };
};
