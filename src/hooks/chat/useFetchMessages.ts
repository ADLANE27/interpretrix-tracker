
import { useCallback, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useMessageProcessing } from './useMessageProcessing';
import { MessageMapRef, ChatChannelType } from './types/chatHooks';

export const useFetchMessages = (
  channelId: string,
  messageProcessing: ReturnType<typeof useMessageProcessing>
) => {
  const {
    setIsLoading,
    setHasMoreMessages,
    userRole,
    messagesMap,
    lastFetchTimestamp,
    updateMessagesArray,
    processMessage
  } = messageProcessing;

  const fetchMessages = useCallback(async (offset = 0, limit = 100) => {
    if (!channelId) return;
    
    setIsLoading(true);
    try {
      console.log(`[useFetchMessages ${userRole.current}] Fetching messages for channel:`, channelId, `(offset: ${offset}, limit: ${limit})`);
      
      // Get channel type
      const { data: channelData, error: channelError } = await supabase
        .from('chat_channels')
        .select('channel_type, created_by')
        .eq('id', channelId)
        .single();

      if (channelError) throw channelError;

      if (!channelData?.channel_type || (channelData.channel_type !== 'group' && channelData.channel_type !== 'direct')) {
        throw new Error('Invalid channel type');
      }

      const channelType = channelData.channel_type as ChatChannelType;

      // Count total messages
      const { count, error: countError } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('channel_id', channelId);

      if (countError) throw countError;
      
      // Get messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (messagesError) {
        console.error(`[useFetchMessages ${userRole.current}] Error fetching messages:`, messagesError);
        throw messagesError;
      }
      
      // Set if there are more messages
      setHasMoreMessages(count !== null && count > offset + messagesData.length);
      console.log(`[useFetchMessages ${userRole.current}] Retrieved messages:`, messagesData?.length, `(total: ${count})`);

      // Process each message
      const senderDetailsPromises = messagesData?.map(message => 
        processMessage(message, channelType)
      ) || [];

      // Wait for all messages to be processed
      await Promise.all(senderDetailsPromises);
      
      // Update messages state
      if (offset === 0) {
        updateMessagesArray();
      } else {
        updateMessagesArray();
      }
      
      // Update last fetch timestamp
      if (messagesData && messagesData.length > 0) {
        const timestamps = messagesData.map(msg => msg.created_at);
        lastFetchTimestamp.current = new Date(Math.max(...timestamps.map(ts => new Date(ts).getTime()))).toISOString();
      }

      console.log(`[useFetchMessages ${userRole.current}] Messages processed and set:`, messagesMap.current.size);
    } catch (error) {
      console.error(`[useFetchMessages ${userRole.current}] Error fetching messages:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [channelId, processMessage, setHasMoreMessages, setIsLoading, updateMessagesArray, userRole, lastFetchTimestamp, messagesMap]);

  const loadMoreMessages = useCallback((currentMessages: number, isLoading: boolean, hasMoreMessages: boolean) => {
    if (isLoading || !hasMoreMessages) return;
    fetchMessages(currentMessages);
  }, [fetchMessages]);

  return {
    fetchMessages,
    loadMoreMessages
  };
};
