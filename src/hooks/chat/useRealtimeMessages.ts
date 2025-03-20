
import { useCallback, useState, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useMessageProcessing } from './useMessageProcessing';
import { RealtimeMessageHandler } from './types/chatHooks';

export const useRealtimeMessages = (
  channelId: string,
  messageProcessing: ReturnType<typeof useMessageProcessing>,
  fetchMessages: () => Promise<void>
) => {
  const {
    messagesMap,
    processingMessage,
    userRole,
    processMessage,
    updateMessagesArray
  } = messageProcessing;

  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const handleRealtimeMessage = useCallback(async (payload: any) => {
    if (processingMessage.current) return;
    
    processingMessage.current = true;
    console.log(`[useRealtimeMessages ${userRole.current}] Realtime message received:`, payload.eventType, payload);
    
    try {
      if (!payload || !payload.new || !channelId) {
        processingMessage.current = false;
        return;
      }
      
      const messageData = payload.new;
      if (messageData.channel_id !== channelId) {
        processingMessage.current = false;
        return;
      }
      
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        if (payload.eventType === 'INSERT' && messagesMap.current.has(messageData.id)) {
          console.log(`[useRealtimeMessages ${userRole.current}] Skipping duplicate message:`, messageData.id);
          processingMessage.current = false;
          return;
        }
        
        const { data: channelData } = await supabase
          .from('chat_channels')
          .select('channel_type')
          .eq('id', channelId)
          .single();
        
        // Process the message
        await processMessage(messageData, channelData?.channel_type as 'group' | 'direct' || 'group');
        
        // Update the messages array
        updateMessagesArray();
        
        console.log(`[useRealtimeMessages ${userRole.current}] Realtime: Message added/updated:`, messageData.id, 'For channel:', channelId);
        
        const messageTimestamp = new Date(messageData.created_at);
        setLastFetchTime(new Date());
      } 
      else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old.id;
        messagesMap.current.delete(deletedId);
        
        // Update the messages array
        updateMessagesArray();
        console.log(`[useRealtimeMessages ${userRole.current}] Realtime: Message deleted:`, deletedId);
      }
    } catch (error) {
      console.error(`[useRealtimeMessages ${userRole.current}] Error handling realtime message:`, error);
    } finally {
      processingMessage.current = false;
    }
  }, [channelId, messagesMap, processingMessage, userRole, processMessage, updateMessagesArray]);

  const forceFetch = useCallback(() => {
    console.log(`[useRealtimeMessages ${userRole.current}] Force fetching messages`);
    fetchMessages();
  }, [fetchMessages, userRole]);

  return {
    lastFetchTime,
    setLastFetchTime,
    retryCount,
    setRetryCount,
    handleRealtimeMessage,
    forceFetch
  };
};
