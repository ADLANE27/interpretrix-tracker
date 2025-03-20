
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

  const fetchMessages = useCallback(async (limit = 50) => {
    if (!channelId || processingMessage.current) return;

    try {
      processingMessage.current = true;
      setIsLoading(true);
      console.log(`[useFetchMessages] Fetching messages for channel ${channelId}, limit: ${limit}`);

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
        console.log('[useFetchMessages] No messages found');
        updateMessagesArray();
        setHasMoreMessages(false);
        return;
      }

      console.log(`[useFetchMessages] Processing ${messages.length} messages`);

      // Process each message
      for (const messageData of messages) {
        await processMessage(convertToMessageData(messageData), channelType);
      }

      // Update the last fetch timestamp
      if (messages.length > 0) {
        lastFetchTimestamp.current = messages[0].created_at;
        setHasMoreMessages(messages.length === limit);
      } else {
        setHasMoreMessages(false);
      }

      updateMessagesArray();
      lastFetchTime.current = new Date();
    } catch (error) {
      console.error('[useFetchMessages] Error in fetchMessages:', error);
    } finally {
      setIsLoading(false);
      processingMessage.current = false;
    }
  }, [
    channelId,
    processingMessage,
    setIsLoading,
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
    if (!channelId || isCurrentlyLoading || !hasMore) return;
    
    console.log(`[useFetchMessages] Loading more messages, current count: ${currentCount}`);
    await fetchMessages(currentCount + 50);
  }, [channelId, fetchMessages]);

  return {
    fetchMessages,
    loadMoreMessages,
    lastFetchTime: lastFetchTime.current
  };
};
