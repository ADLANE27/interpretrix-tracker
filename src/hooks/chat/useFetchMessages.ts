
import { useCallback } from 'react';
import { convertToMessageData, fetchChannelType, fetchMessagesFromDb, sortMessagesByTimestamp } from './utils/fetchUtils';
import { useFetchState } from './useFetchState';
import { useBatchProcessor } from './useBatchProcessor';

// Define an interface for message processing hook
interface MessageProcessingHook {
  messagesMap: React.MutableRefObject<Map<string, any>>;
  updateMessagesArray: () => void;
  setIsLoading: (isLoading: boolean) => void;
  processingMessage: React.MutableRefObject<boolean>;
  lastFetchTimestamp: React.MutableRefObject<string | null>;
  setHasMoreMessages: (hasMore: boolean) => void;
  processMessage: (messageData: any, channelType: 'group' | 'direct') => Promise<void>;
}

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

  // Get fetch state management
  const { controls, state, debouncedSetLoading, resetFetchState } = useFetchState();
  
  // Get batch processor
  const { processBatch } = useBatchProcessor({
    processMessage,
    updateMessagesArray
  });

  // Main fetch function
  const fetchMessages = useCallback(async (limit = 100) => {
    const now = Date.now();
    const timeSinceLastFetch = now - controls.lastFetchStartTime.current;
    
    // Apply throttling for repeated fetches
    if (controls.fetchLock.current && 
        !controls.forceInitialLoad.current && 
        timeSinceLastFetch < controls.minimumFetchDelay.current && 
        controls.initialFetchDone.current && 
        !controls.refreshInProgress.current) {
      console.log('[useFetchMessages] Fetch throttled, will retry later');
      setTimeout(() => fetchMessages(limit), controls.minimumFetchDelay.current / 2);
      return;
    }
    
    controls.forceInitialLoad.current = false;
    
    if (!channelId) {
      console.log('[useFetchMessages] No channel ID provided');
      return;
    }

    if (processingMessage.current && !controls.refreshInProgress.current) {
      console.log('[useFetchMessages] Already processing a message');
      return;
    }

    if (controls.activeFetch.current && !controls.refreshInProgress.current) {
      console.log('[useFetchMessages] Active fetch in progress');
      return;
    }

    try {
      controls.fetchLock.current = true;
      controls.lastFetchStartTime.current = now;
      controls.activeFetch.current = true;
      processingMessage.current = true;
      
      // Show loading indicator only for the very first load
      if (!controls.initialFetchDone.current) {
        setIsLoading(true);
      } else {
        debouncedSetLoading(true, setIsLoading);
      }
      
      // Get channel type
      const channelType = await fetchChannelType(channelId);

      // Clear messages if this is a full refresh or first load
      if (limit >= 150 || controls.refreshInProgress.current || !controls.initialFetchDone.current) {
        messagesMap.current.clear();
      }

      const effectiveLimit = Math.max(limit, 100);
      
      // Fetch messages from database - always fetch a decent amount
      const messages = await fetchMessagesFromDb(channelId, effectiveLimit);
      
      if (!messages || messages.length === 0) {
        // Still update UI even when there are no messages to show empty state
        updateMessagesArray();
        setHasMoreMessages(false);
        controls.initialFetchDone.current = true;
        return;
      }
      
      // Sort messages by timestamp before processing for more stable order
      const sortedMessages = sortMessagesByTimestamp(messages);
      
      console.log(`[useFetchMessages] Processing ${sortedMessages.length} messages in stable order`);
      
      // Process messages in batches
      await processBatch(
        sortedMessages.map(msg => convertToMessageData(msg)), 
        channelType, 
        20
      );
      
      // Update last fetch timestamp and hasMore state
      if (sortedMessages.length > 0) {
        lastFetchTimestamp.current = sortedMessages[0].created_at;
        setHasMoreMessages(sortedMessages.length >= effectiveLimit);
      } else {
        setHasMoreMessages(false);
      }
      
      // Update state
      state.lastFetchTime.current = new Date();
      controls.initialFetchDone.current = true;
      
      // Important: update the messages array to ensure UI reflects the most recent state
      updateMessagesArray();
      
      // Schedule additional updates after a short delay to ensure all messages are displayed
      // Use progressive delays for maximum stability
      setTimeout(() => { updateMessagesArray(); }, 200);
      setTimeout(() => { updateMessagesArray(); }, 500);
      setTimeout(() => { updateMessagesArray(); }, 1000);
      
      console.log(`[useFetchMessages] Processed ${messagesMap.current.size} messages`);
      
    } catch (error) {
      console.error('[useFetchMessages] Error in fetchMessages:', error);
    } finally {
      if (controls.initialLoadingTimer.current) {
        clearTimeout(controls.initialLoadingTimer.current);
        controls.initialLoadingTimer.current = null;
      }
      
      // Short delay before hiding loading indicator
      setTimeout(() => {
        debouncedSetLoading(false, setIsLoading);
      }, 500); // Increased delay for better UX
      
      // Release flags in a staggered way to avoid conflicts
      setTimeout(() => {
        processingMessage.current = false;
      }, 200);
      
      setTimeout(() => {
        controls.activeFetch.current = false;
      }, 300);
      
      setTimeout(() => {
        controls.refreshInProgress.current = false;
      }, 400);
      
      // Release fetch lock with significant delay
      setTimeout(() => {
        controls.fetchLock.current = false;
      }, 800); // Increased delay to avoid repetitive fetches
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
    setIsLoading,
    controls,
    state,
    processBatch
  ]);

  // Load more messages
  const loadMoreMessages = useCallback(async (
    currentCount: number,
    isCurrentlyLoading: boolean,
    hasMore: boolean
  ) => {
    if (!channelId || isCurrentlyLoading || !hasMore || controls.activeFetch.current) return;
    
    // Increase fetch limit when loading more messages
    await fetchMessages(currentCount + 50);
  }, [channelId, fetchMessages, controls.activeFetch]);

  // Force refresh
  const forceRefresh = useCallback(() => {
    resetFetchState();
    return fetchMessages(200); // Fetch more messages on forced refresh
  }, [fetchMessages, resetFetchState]);

  return {
    fetchMessages,
    loadMoreMessages,
    forceRefresh,
    lastFetchTime: state.lastFetchTime.current,
    initialFetchDone: controls.initialFetchDone.current
  };
};
