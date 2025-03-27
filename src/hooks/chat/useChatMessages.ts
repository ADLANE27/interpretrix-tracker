
import { useState, useEffect, useCallback, useRef } from 'react';
import { Message } from '@/types/messaging';
import { useMessageProcessing } from './useMessageProcessing';
import { useMessagePagination } from './useMessagePagination';
import { useMessageRealtime } from './useMessageRealtime';

export const useChatMessages = (channelId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  
  // Use a Map for storing messages to easily handle deduplication by ID
  const messagesMap = useRef<Map<string, Message>>(new Map());
  const lastFetchTimestamp = useRef<string | null>(null);
  
  const { checkUserRole, formatMessage, userRole } = useMessageProcessing();
  const { 
    fetchChannelType, 
    getMessageCount, 
    fetchMessageBatch, 
    hasMoreMessages, 
    setHasMoreMessages,
    isLoading,
    setIsLoading,
    MAX_MESSAGES
  } = useMessagePagination(userRole);
  
  const { handleRealtimeMessage } = useMessageRealtime(channelId, messagesMap, setMessages);

  // Clear message cache when channel changes
  useEffect(() => {
    if (channelId) {
      messagesMap.current.clear();
    }
    
    // Determine user role
    checkUserRole();
  }, [channelId]);

  const fetchMessages = useCallback(async (offset = 0, limit = MAX_MESSAGES) => {
    if (!channelId) return;
    
    setIsLoading(true);
    try {
      console.log(`[useChat ${userRole.current}] Fetching messages for channel:`, channelId, `(offset: ${offset}, limit: ${limit})`);
      
      // Get channel type
      const channelType = await fetchChannelType(channelId);
      
      // Get total count to know if there are more messages
      const count = await getMessageCount(channelId);
      
      // Fetch messages with pagination
      const messagesData = await fetchMessageBatch(channelId, offset, limit);
      
      // Determine if there are more messages to load
      setHasMoreMessages(count > offset + messagesData.length);
      console.log(`[useChat ${userRole.current}] Retrieved messages:`, messagesData?.length, `(total: ${count})`);

      // Update the last fetch time
      setLastFetchTime(new Date());

      const senderDetailsPromises = messagesData.map(async (message) => {
        try {
          // Check if we already have this message in messagesMap
          if (messagesMap.current.has(message.id)) {
            // Update timestamp for existing message to ensure proper sorting
            const existingMessage = messagesMap.current.get(message.id)!;
            existingMessage.timestamp = new Date(message.created_at);
            return existingMessage;
          }
          
          const formattedMessage = await formatMessage(message, channelType);
          if (formattedMessage) {
            // Store message in the Map for deduplication
            messagesMap.current.set(message.id, formattedMessage);
          }
          
          return formattedMessage;
        } catch (error) {
          console.error(`[useChat ${userRole.current}] Error formatting message:`, error, message);
          return null;
        }
      });

      const formattedMessagesResults = await Promise.all(senderDetailsPromises);
      const validMessages = formattedMessagesResults.filter((msg): msg is Message => 
        msg !== null && 
        typeof msg === 'object' &&
        typeof msg.id === 'string' &&
        typeof msg.content === 'string' &&
        typeof msg.sender === 'object' &&
        typeof msg.sender.id === 'string' &&
        typeof msg.sender.name === 'string' &&
        msg.timestamp instanceof Date
      );
      
      // For pagination, merge existing messages with new ones and sort
      const allMessages = Array.from(messagesMap.current.values())
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      setMessages(allMessages);
      
      // Store the timestamp of the most recent message for incremental updates
      if (messagesData && messagesData.length > 0) {
        const timestamps = messagesData.map(msg => msg.created_at);
        lastFetchTimestamp.current = new Date(Math.max(...timestamps.map(ts => new Date(ts).getTime()))).toISOString();
      }

      console.log(`[useChat ${userRole.current}] Messages processed and set:`, messagesMap.current.size);
    } catch (error) {
      console.error(`[useChat ${userRole.current}] Error fetching messages:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [channelId, fetchChannelType, formatMessage, getMessageCount, fetchMessageBatch, MAX_MESSAGES, userRole]);

  const loadMoreMessages = useCallback(() => {
    if (isLoading || !hasMoreMessages) return;
    fetchMessages(messages.length);
  }, [fetchMessages, messages.length, isLoading, hasMoreMessages]);

  // Force a refresh of messages periodically to ensure users see latest messages
  useEffect(() => {
    if (!channelId) return;
    
    const refreshInterval = setInterval(() => {
      // Only refresh if we haven't fetched recently (in last 10 seconds)
      const shouldRefresh = !lastFetchTime || (new Date().getTime() - lastFetchTime.getTime() > 10000);
      if (shouldRefresh) {
        console.log(`[useChat ${userRole.current}] Performing periodic refresh of messages`);
        fetchMessages(0);
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(refreshInterval);
  }, [channelId, fetchMessages, lastFetchTime, userRole]);

  useEffect(() => {
    if (channelId) {
      console.log(`[useChat ${userRole.current}] Initial messages fetch for channel:`, channelId);
      // Clear the message map when switching channels
      messagesMap.current.clear();
      lastFetchTimestamp.current = null;
      fetchMessages(0);
    }
  }, [channelId, fetchMessages, userRole]);

  // Add a function to force fetch regardless of last fetch time
  const forceFetch = useCallback(() => {
    console.log(`[useChat ${userRole.current}] Force fetching messages`);
    fetchMessages(0);
  }, [fetchMessages, userRole]);

  return {
    messages,
    isLoading,
    handleRealtimeMessage,
    fetchMessages,
    forceFetch,
    loadMoreMessages,
    hasMoreMessages,
    setMessages,
    messagesMap
  };
};
