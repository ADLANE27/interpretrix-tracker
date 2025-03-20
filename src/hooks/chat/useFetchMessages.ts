
import { useCallback, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Json } from '@/integrations/supabase/types.generated';
import { MessageData } from '@/types/messaging';

// Define a type for the message processing interface
interface MessageProcessingHook {
  messagesMap: React.MutableRefObject<Map<string, any>>;
  updateMessagesArray: () => void;
  setIsLoading: (isLoading: boolean) => void;
  processingMessage: React.MutableRefObject<boolean>;
  lastFetchTimestamp: React.MutableRefObject<string | null>;
  setHasMoreMessages: (hasMore: boolean) => void;
  processMessage: (messageData: MessageData, channelType: 'group' | 'direct') => Promise<void>;
}

// Helper to convert from database message to MessageData
const convertToMessageData = (dbMessage: any): MessageData => {
  return {
    id: dbMessage.id,
    content: dbMessage.content,
    sender_id: dbMessage.sender_id,
    created_at: dbMessage.created_at,
    parent_message_id: dbMessage.parent_message_id,
    reactions: dbMessage.reactions,
    attachments: dbMessage.attachments ? dbMessage.attachments.map((attachment: Json) => {
      if (typeof attachment === 'object' && attachment !== null) {
        return attachment as any;
      }
      return {
        url: '',
        filename: '',
        type: '',
        size: 0
      };
    }) : []
  };
};

export const useFetchMessages = (
  channelId: string,
  messageProcessing: MessageProcessingHook
) => {
  const { 
    messagesMap,
    updateMessagesArray,
    setIsLoading,
    processingMessage,
    lastFetchTimestamp,
    setHasMoreMessages,
    processMessage
  } = messageProcessing;

  const lastFetchTime = useRef<Date | null>(null);
  const initialFetchDone = useRef<boolean>(false);
  const activeFetch = useRef<boolean>(false);
  const fetchDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const stableMessageCount = useRef<number>(0);
  const fetchLock = useRef<boolean>(false);
  const minimumFetchDelay = useRef<number>(1000); // Further reduced minimum time between fetches
  const lastFetchStartTime = useRef<number>(0);
  const initialLoadingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSetLoading = useCallback((loading: boolean) => {
    // Only show loading state after a delay to prevent flickering
    if (loading) {
      if (fetchDebounceTimer.current) {
        clearTimeout(fetchDebounceTimer.current);
      }
      
      // Shorter delay before showing loading state
      fetchDebounceTimer.current = setTimeout(() => {
        if (activeFetch.current) {
          setIsLoading(true);
        }
      }, 200); // Reduced loading delay for quicker feedback
    } else {
      if (fetchDebounceTimer.current) {
        clearTimeout(fetchDebounceTimer.current);
        fetchDebounceTimer.current = null;
      }
      setIsLoading(false);
    }
  }, [setIsLoading]);

  const fetchMessages = useCallback(async (limit = 50) => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchStartTime.current;
    
    // Even less restrictive fetch throttling for initial loads
    if (fetchLock.current || 
        (timeSinceLastFetch < minimumFetchDelay.current && initialFetchDone.current && limit <= 50)) {
      return;
    }
    
    if (!channelId || processingMessage.current || activeFetch.current) {
      return;
    }

    try {
      fetchLock.current = true;
      lastFetchStartTime.current = now;
      activeFetch.current = true;
      processingMessage.current = true;
      
      // Set a timer for initial loading state
      if (!initialFetchDone.current) {
        if (initialLoadingTimerRef.current) {
          clearTimeout(initialLoadingTimerRef.current);
        }
        
        // Show loading state very quickly for initial loads
        initialLoadingTimerRef.current = setTimeout(() => {
          if (activeFetch.current && !initialFetchDone.current) {
            setIsLoading(true);
          }
        }, 100);
      } else {
        debouncedSetLoading(true);
      }
      
      const { data: channel, error: channelError } = await supabase
        .from('chat_channels')
        .select('channel_type')
        .eq('id', channelId)
        .single();

      if (channelError) {
        console.error('[useFetchMessages] Error fetching channel:', channelError);
        return;
      }

      const channelType = channel.channel_type as 'group' | 'direct';

      // Clear existing messages if this is a fresh fetch
      if (limit > 0) {
        messagesMap.current.clear();
      }

      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[useFetchMessages] Error fetching messages:', error);
        return;
      }

      if (!messages || messages.length === 0) {
        updateMessagesArray();
        setHasMoreMessages(false);
        initialFetchDone.current = true;
        return;
      }
      
      // Track if we're changing the message count significantly
      const previousCount = messagesMap.current.size;

      // Process messages in parallel but in smaller batches for better responsiveness
      const batchSize = 10;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const processPromises = batch.map(messageData => 
          processMessage(convertToMessageData(messageData), channelType)
        );
        
        await Promise.all(processPromises);
        
        // Update UI after each batch for better perceived performance
        if (i + batchSize >= messages.length / 2) {
          updateMessagesArray();
        }
      }
      
      // Update the last fetch timestamp
      if (messages.length > 0) {
        lastFetchTimestamp.current = messages[0].created_at;
        setHasMoreMessages(messages.length === limit);
      } else {
        setHasMoreMessages(false);
      }
      
      const newCount = messagesMap.current.size;
      
      // Always update on initial load for faster rendering
      if (newCount > 0) {
        // Force update the messages array immediately
        updateMessagesArray();
        stableMessageCount.current = newCount;
      }
      
      lastFetchTime.current = new Date();
      initialFetchDone.current = true;
      
      // Force a second update sooner for initial loads
      setTimeout(() => {
        if (messagesMap.current.size > 0) {
          updateMessagesArray();
        }
      }, 50);
      
      // Release the fetch lock sooner for initial loads
      setTimeout(() => {
        fetchLock.current = false;
      }, initialFetchDone.current ? 300 : minimumFetchDelay.current);
      
    } catch (error) {
      console.error('[useFetchMessages] Error in fetchMessages:', error);
    } finally {
      // Clear initial loading timer if it exists
      if (initialLoadingTimerRef.current) {
        clearTimeout(initialLoadingTimerRef.current);
        initialLoadingTimerRef.current = null;
      }
      
      // Shorter delay before hiding loading state
      setTimeout(() => {
        debouncedSetLoading(false);
      }, 50);
      
      processingMessage.current = false;
      activeFetch.current = false;
      
      // Schedule releasing the lock after minimum delay
      setTimeout(() => {
        fetchLock.current = false;
      }, initialFetchDone.current ? 300 : minimumFetchDelay.current);
    }
  }, [
    channelId,
    processingMessage,
    debouncedSetLoading,
    messagesMap,
    lastFetchTimestamp,
    setHasMoreMessages,
    updateMessagesArray,
    processMessage,
    setIsLoading
  ]);

  const loadMoreMessages = useCallback(async (
    currentCount: number,
    isCurrentlyLoading: boolean,
    hasMore: boolean
  ) => {
    if (!channelId || isCurrentlyLoading || !hasMore || activeFetch.current) return;
    
    await fetchMessages(currentCount + 50);
  }, [channelId, fetchMessages]);

  const forceRefresh = useCallback(() => {
    // Bypass the lock for force refreshes
    fetchLock.current = false;
    initialFetchDone.current = false;
    return fetchMessages(50);
  }, [fetchMessages]);

  return {
    fetchMessages,
    loadMoreMessages,
    forceRefresh,
    lastFetchTime: lastFetchTime.current,
    initialFetchDone: initialFetchDone.current
  };
};
