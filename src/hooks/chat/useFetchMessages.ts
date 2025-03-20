
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
  const minimumFetchDelay = useRef<number>(3000); // Minimum time between fetches
  const lastFetchStartTime = useRef<number>(0);

  const debouncedSetLoading = useCallback((loading: boolean) => {
    // Only show loading state after a delay to prevent flickering
    if (loading) {
      if (fetchDebounceTimer.current) {
        clearTimeout(fetchDebounceTimer.current);
      }
      
      // Short delay before showing loading state
      fetchDebounceTimer.current = setTimeout(() => {
        if (activeFetch.current) {
          setIsLoading(true);
        }
      }, 1000); // Longer delay to avoid flickering for quick operations
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
    
    // Prevent too frequent fetches
    if (fetchLock.current || 
        (timeSinceLastFetch < minimumFetchDelay.current && initialFetchDone.current)) {
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
      debouncedSetLoading(true);
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
      
      // Only update the UI if we actually have messages or the count changed significantly
      if (newCount > 0 && (Math.abs(newCount - previousCount) > 0 || !initialFetchDone.current)) {
        console.log(`[useFetchMessages] Calling updateMessagesArray with ${messagesMap.current.size} messages (changed from ${previousCount})`);
        
        // Force update the messages array immediately
        updateMessagesArray();
        stableMessageCount.current = newCount;
      } else {
        console.log(`[useFetchMessages] Skipping update, no significant changes (${previousCount} -> ${newCount})`);
      }
      
      lastFetchTime.current = new Date();
      initialFetchDone.current = true;
      
      // Force a second update after a short delay to ensure UI updates
      // This helps with race conditions where the state update might not trigger a re-render
      setTimeout(() => {
        if (messagesMap.current.size > 0) {
          console.log(`[useFetchMessages] Triggering secondary update with ${messagesMap.current.size} messages`);
          updateMessagesArray();
        }
      }, 200);
      
      // Release the fetch lock after a minimum delay
      setTimeout(() => {
        fetchLock.current = false;
      }, minimumFetchDelay.current);
      
    } catch (error) {
      console.error('[useFetchMessages] Error in fetchMessages:', error);
    } finally {
      setTimeout(() => {
        debouncedSetLoading(false);
      }, 200); // Small delay to ensure loading isn't removed too quickly
      
      processingMessage.current = false;
      activeFetch.current = false;
      
      // Schedule releasing the lock after minimum delay
      setTimeout(() => {
        fetchLock.current = false;
      }, minimumFetchDelay.current);
    }
  }, [
    channelId,
    processingMessage,
    debouncedSetLoading,
    messagesMap,
    lastFetchTimestamp,
    setHasMoreMessages,
    updateMessagesArray,
    processMessage
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
