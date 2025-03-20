
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useMessageProcessing } from './chat/useMessageProcessing';
import { useFetchMessages } from './chat/useFetchMessages';
import { useRealtimeMessages } from './chat/useRealtimeMessages';
import { useSubscriptions } from './chat/useSubscriptions';
import { useMessageActions } from './chat/useMessageActions';

export const useChat = (channelId: string) => {
  // Message processing state and handlers
  const messageProcessing = useMessageProcessing(channelId);
  const { 
    messages, 
    isLoading, 
    messagesMap,
    hasMoreMessages,
    checkUserRole
  } = messageProcessing;

  // Handle fetching messages
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Get message fetching functions
  const { 
    fetchMessages, 
    loadMoreMessages,
    forceRefresh 
  } = useFetchMessages(
    channelId, 
    messageProcessing
  );

  // Realtime message handling
  const { 
    lastFetchTime,
    retryCount, 
    setRetryCount, 
    handleRealtimeMessage,
    forceFetch
  } = useRealtimeMessages(
    channelId, 
    messageProcessing, 
    fetchMessages
  );

  // Subscriptions to realtime events
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

  // Message modification actions
  const { 
    sendMessage,
    deleteMessage,
    reactToMessage,
    markMentionsAsRead,
  } = useMessageActions(
    channelId,
    currentUserId,
    fetchMessages
  );

  // Custom delete handler to update local state
  const handleDeleteMessage = async (messageId: string) => {
    try {
      messagesMap.current.delete(messageId);
      
      const updatedMessages = Array.from(messagesMap.current.values())
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      messageProcessing.setMessages(updatedMessages);
      
      await deleteMessage(messageId);
      
      console.log(`[useChat] Message deleted locally:`, messageId);
    } catch (error) {
      console.error(`[useChat] Error handling message deletion:`, error);
      fetchMessages(0);
    }
  };

  // Get current user on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Check user role on mount
  useEffect(() => {
    checkUserRole();
  }, [checkUserRole]);

  // Reset and fetch messages when channel changes
  useEffect(() => {
    if (channelId) {
      console.log(`[useChat] Initial messages fetch for channel:`, channelId);
      messagesMap.current.clear();
      messageProcessing.lastFetchTimestamp.current = null;
      
      // Fetch more messages initially (150 instead of 100) to ensure we have enough history
      fetchMessages(150);
      
      // Add a backup fetch after a delay in case the initial fetch didn't update the UI
      const timer = setTimeout(() => {
        if (messages.length === 0 && !isLoading) {
          console.log(`[useChat] Backup fetch triggered due to empty messages array`);
          forceRefresh();
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [channelId, fetchMessages, messagesMap, messageProcessing.lastFetchTimestamp, messages.length, isLoading, forceRefresh]);

  // Periodic refresh
  useEffect(() => {
    if (!channelId) return;
    
    const refreshInterval = setInterval(() => {
      const shouldRefresh = !lastFetchTime || (new Date().getTime() - lastFetchTime.getTime() > 10000);
      if (shouldRefresh) {
        console.log(`[useChat] Performing periodic refresh of messages`);
        fetchMessages(150); // Fetch more messages on refresh
      }
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [channelId, fetchMessages, lastFetchTime]);

  // Handle loading more messages
  const handleLoadMoreMessages = useCallback(() => {
    loadMoreMessages(messages.length, isLoading, hasMoreMessages);
  }, [loadMoreMessages, messages.length, isLoading, hasMoreMessages]);
  
  // Debug log for initial mount and updates
  useEffect(() => {
    console.log(`[useChat] Component update - messages count: ${messages.length}, isLoading: ${isLoading}, isSubscribed: ${isSubscribed}`);
  }, [messages.length, isLoading, isSubscribed]);

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
    forceFetch: forceRefresh, // Use the enhanced refresh function
    loadMoreMessages: handleLoadMoreMessages,
    hasMoreMessages
  };
};
