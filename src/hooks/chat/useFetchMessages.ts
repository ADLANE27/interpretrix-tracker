
import { useCallback } from 'react';
import { convertToMessageData, fetchChannelType, fetchMessagesFromDb } from './utils/fetchUtils';
import { useFetchState } from './useFetchState';
import { useBatchProcessor } from './useBatchProcessor';
import { FetchOptions } from './types/fetchTypes';

// Define a type for the message processing interface
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
      
      if (!controls.initialFetchDone.current) {
        setIsLoading(true);
      } else {
        debouncedSetLoading(true, setIsLoading);
      }
      
      // Get channel type
      const channelType = await fetchChannelType(channelId);

      // Clear messages if this is a full refresh
      if (limit === 100 || limit >= 150 || controls.refreshInProgress.current) {
        messagesMap.current.clear();
      }

      const effectiveLimit = Math.max(limit, 100);
      
      // Fetch messages from database - always fetch a decent amount
      const messages = await fetchMessagesFromDb(channelId, effectiveLimit);

      if (!messages || messages.length === 0) {
        updateMessagesArray();
        setHasMoreMessages(false);
        controls.initialFetchDone.current = true;
        return;
      }
      
      const previousCount = messagesMap.current.size;

      // Process messages in batches
      await processBatch(
        messages.map(msg => convertToMessageData(msg)), 
        channelType, 
        20
      );
      
      // Update last fetch timestamp and hasMore state
      if (messages.length > 0) {
        lastFetchTimestamp.current = messages[0].created_at;
        setHasMoreMessages(messages.length >= effectiveLimit);
      } else {
        setHasMoreMessages(false);
      }
      
      // Update state
      const newCount = messagesMap.current.size;
      
      if (newCount > 0) {
        updateMessagesArray();
        state.stableMessageCount.current = newCount;
      }
      
      state.lastFetchTime.current = new Date();
      controls.initialFetchDone.current = true;
      
      console.log(`[useFetchMessages] Processed ${newCount} messages`);
      
    } catch (error) {
      console.error('[useFetchMessages] Error in fetchMessages:', error);
    } finally {
      if (controls.initialLoadingTimer.current) {
        clearTimeout(controls.initialLoadingTimer.current);
        controls.initialLoadingTimer.current = null;
      }
      
      setTimeout(() => {
        debouncedSetLoading(false, setIsLoading);
      }, 50);
      
      processingMessage.current = false;
      controls.activeFetch.current = false;
      controls.refreshInProgress.current = false;
      
      setTimeout(() => {
        controls.fetchLock.current = false;
      }, 100);
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
    
    // Increase the fetch limit when loading more messages
    await fetchMessages(currentCount + 50);
  }, [channelId, fetchMessages, controls.activeFetch]);

  // Force refresh
  const forceRefresh = useCallback(() => {
    resetFetchState();
    return fetchMessages(150); // Fetch more messages on force refresh
  }, [fetchMessages, resetFetchState]);

  return {
    fetchMessages,
    loadMoreMessages,
    forceRefresh,
    lastFetchTime: state.lastFetchTime.current,
    initialFetchDone: controls.initialFetchDone.current
  };
};
