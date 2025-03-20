
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
  const minimumFetchDelay = useRef<number>(1500); // Reduced minimum time between fetches
  const lastFetchStartTime = useRef<number>(0);

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
      }, 300); // Reduced loading delay for quicker feedback
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
    
    // Less restrictive fetch throttling for initial loads
    if (fetchLock.current || 
        (timeSinceLastFetch < minimumFetchDelay.current && initialFetchDone.current && limit <= 50)) {
      console.log(`[useFetchMessages] Skipping fetch, too soon (${timeSinceLastFetch}ms since last fetch)`);
      return;
    }
    
    if (!channelId || processingMessage.current || activeFetch.current) {
      console.log(`[useFetchMessages] Skipping fetch, already in progress or invalid state`);
      return;
    }

    try {
      fetchLock.current = true;
      lastFetchStartTime.current = now;
      activeFetch.current = true;
      processingMessage.current = true;
      
      // Only show loading for non-initial fetches or if taking longer than expected
      const isInitialFetch = !initialFetchDone.current;
      if (!isInitialFetch) {
        debouncedSetLoading(true);
      } else {
        // For initial fetch, set a shorter timeout to show loading state
        setTimeout(() => {
          if (activeFetch.current && !initialFetchDone.current) {
            setIsLoading(true);
          }
        }, 200);
      }
      
      console.log(`[useFetchMessages] Fetching messages for channel ${channelId}, limit: ${limit}, initialFetchDone: ${initialFetchDone.current}`);

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

      console.log(`[useFetchMessages] Retrieved ${messages?.length || 0} messages from database`);

      if (!messages || messages.length === 0) {
        console.log('[useFetchMessages] No messages found');
        updateMessagesArray();
        setHasMoreMessages(false);
        initialFetchDone.current = true;
        return;
      }

      console.log(`[useFetchMessages] Processing ${messages.length} messages`);
      
      // Track if we're changing the message count significantly
      const previousCount = messagesMap.current.size;

      // Process all messages in parallel for faster loading
      const processPromises = messages.map(messageData => 
        processMessage(convertToMessageData(messageData), channelType)
      );
      
      await Promise.all(processPromises);
      
      // Update the last fetch timestamp
      if (messages.length > 0) {
        lastFetchTimestamp.current = messages[0].created_at;
        setHasMoreMessages(messages.length === limit);
      } else {
        setHasMoreMessages(false);
      }
      
      const newCount = messagesMap.current.size;
      
      // Always update on initial load for faster rendering
      if (newCount > 0 && (!initialFetchDone.current || Math.abs(newCount - previousCount) > 0)) {
        console.log(`[useFetchMessages] Calling updateMessagesArray with ${messagesMap.current.size} messages (changed from ${previousCount})`);
        
        // Force update the messages array immediately
        updateMessagesArray();
        stableMessageCount.current = newCount;
      } else {
        console.log(`[useFetchMessages] Skipping update, no significant changes (${previousCount} -> ${newCount})`);
      }
      
      lastFetchTime.current = new Date();
      initialFetchDone.current = true;
      
      // Force a second update sooner for initial loads
      const updateDelay = isInitialFetch ? 100 : 200;
      setTimeout(() => {
        if (messagesMap.current.size > 0) {
          console.log(`[useFetchMessages] Triggering secondary update with ${messagesMap.current.size} messages`);
          updateMessagesArray();
        }
      }, updateDelay);
      
      // Release the fetch lock sooner for initial loads
      setTimeout(() => {
        fetchLock.current = false;
      }, isInitialFetch ? 500 : minimumFetchDelay.current);
      
    } catch (error) {
      console.error('[useFetchMessages] Error in fetchMessages:', error);
    } finally {
      // Shorter delay before hiding loading state
      setTimeout(() => {
        debouncedSetLoading(false);
      }, 100);
      
      processingMessage.current = false;
      activeFetch.current = false;
      
      // Schedule releasing the lock after minimum delay
      setTimeout(() => {
        fetchLock.current = false;
      }, initialFetchDone.current ? minimumFetchDelay.current : 500);
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
    
    console.log(`[useFetchMessages] Loading more messages, current count: ${currentCount}`);
    await fetchMessages(currentCount + 50);
  }, [channelId, fetchMessages]);

  const forceRefresh = useCallback(() => {
    console.log('[useFetchMessages] Forcing a refresh of messages');
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
