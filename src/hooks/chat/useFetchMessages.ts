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
    channel_id: dbMessage.channel_id,
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
  const minimumFetchDelay = useRef<number>(300);
  const lastFetchStartTime = useRef<number>(0);
  const initialLoadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshInProgress = useRef<boolean>(false);
  const forceInitialLoadRef = useRef<boolean>(true);

  const debouncedSetLoading = useCallback((loading: boolean) => {
    if (loading) {
      if (fetchDebounceTimer.current) {
        clearTimeout(fetchDebounceTimer.current);
      }
      
      fetchDebounceTimer.current = setTimeout(() => {
        if (activeFetch.current) {
          setIsLoading(true);
        }
      }, 100);
    } else {
      if (fetchDebounceTimer.current) {
        clearTimeout(fetchDebounceTimer.current);
        fetchDebounceTimer.current = null;
      }
      setIsLoading(false);
    }
  }, [setIsLoading]);

  const fetchMessages = useCallback(async (limit = 100) => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchStartTime.current;
    
    if (fetchLock.current && 
        !forceInitialLoadRef.current && 
        timeSinceLastFetch < minimumFetchDelay.current && 
        initialFetchDone.current && 
        !refreshInProgress.current) {
      console.log('[useFetchMessages] Fetch throttled, will retry later');
      setTimeout(() => fetchMessages(limit), minimumFetchDelay.current / 2);
      return;
    }
    
    forceInitialLoadRef.current = false;
    
    if (!channelId) {
      console.log('[useFetchMessages] No channel ID provided');
      return;
    }

    if (processingMessage.current && !refreshInProgress.current) {
      console.log('[useFetchMessages] Already processing a message');
      return;
    }

    if (activeFetch.current && !refreshInProgress.current) {
      console.log('[useFetchMessages] Active fetch in progress');
      return;
    }

    try {
      fetchLock.current = true;
      lastFetchStartTime.current = now;
      activeFetch.current = true;
      processingMessage.current = true;
      
      if (!initialFetchDone.current) {
        setIsLoading(true);
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

      if (limit === 100 || refreshInProgress.current) {
        messagesMap.current.clear();
      }

      const effectiveLimit = Math.max(limit, 100);

      console.log(`[useFetchMessages] Fetching messages with limit: ${effectiveLimit}`);
      
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(effectiveLimit);

      if (error) {
        console.error('[useFetchMessages] Error fetching messages:', error);
        return;
      }

      console.log(`[useFetchMessages] Fetched ${messages?.length || 0} messages`);

      if (!messages || messages.length === 0) {
        updateMessagesArray();
        setHasMoreMessages(false);
        initialFetchDone.current = true;
        return;
      }
      
      const previousCount = messagesMap.current.size;

      const batchSize = 20;
      const messagesToProcess = [...messages];

      for (let i = 0; i < messagesToProcess.length; i += batchSize) {
        const batch = messagesToProcess.slice(i, i + batchSize);
        const processPromises = batch.map(messageData => 
          processMessage(convertToMessageData(messageData), channelType)
        );
        
        await Promise.all(processPromises);
        
        if (i + batchSize >= messagesToProcess.length / 2) {
          updateMessagesArray();
        }
      }
      
      if (messages.length > 0) {
        lastFetchTimestamp.current = messages[0].created_at;
        setHasMoreMessages(messages.length >= effectiveLimit);
      } else {
        setHasMoreMessages(false);
      }
      
      const newCount = messagesMap.current.size;
      
      if (newCount > 0) {
        updateMessagesArray();
        stableMessageCount.current = newCount;
      }
      
      lastFetchTime.current = new Date();
      initialFetchDone.current = true;
      
      console.log(`[useFetchMessages] Processed ${newCount} messages`);
      
      setTimeout(() => {
        if (messagesMap.current.size > 0) {
          updateMessagesArray();
        }
      }, 50);
      
      setTimeout(() => {
        if (messagesMap.current.size > 0) {
          updateMessagesArray();
        }
      }, 200);
      
    } catch (error) {
      console.error('[useFetchMessages] Error in fetchMessages:', error);
    } finally {
      if (initialLoadingTimerRef.current) {
        clearTimeout(initialLoadingTimerRef.current);
        initialLoadingTimerRef.current = null;
      }
      
      setTimeout(() => {
        debouncedSetLoading(false);
      }, 50);
      
      processingMessage.current = false;
      activeFetch.current = false;
      refreshInProgress.current = false;
      
      setTimeout(() => {
        fetchLock.current = false;
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
    fetchLock.current = false;
    refreshInProgress.current = true;
    initialFetchDone.current = false;
    forceInitialLoadRef.current = true;
    return fetchMessages(150);
  }, [fetchMessages]);

  return {
    fetchMessages,
    loadMoreMessages,
    forceRefresh,
    lastFetchTime: lastFetchTime.current,
    initialFetchDone: initialFetchDone.current
  };
};
