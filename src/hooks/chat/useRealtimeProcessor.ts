
import { useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";

export const useRealtimeProcessor = (
  channelId: string,
  userRole: React.MutableRefObject<string>,
  messagesMap: React.MutableRefObject<Map<string, any>>,
  processingMessage: React.MutableRefObject<boolean>,
  processMessage: (messageData: any, channelType: 'group' | 'direct') => Promise<void>,
  updateMessagesArray: () => void
) => {
  const processRealtimeEvent = useCallback(async (
    payload: any,
    isProcessingEvent: React.MutableRefObject<boolean>,
    getNextFromQueue: () => any | null,
    processingTimeout: React.MutableRefObject<NodeJS.Timeout | null>
  ) => {
    if (processingMessage.current || isProcessingEvent.current) {
      return false;
    }
    
    isProcessingEvent.current = true;
    processingMessage.current = true;
    
    try {
      if (!payload || !payload.new || !channelId) {
        processingMessage.current = false;
        isProcessingEvent.current = false;
        return true;
      }
      
      const messageData = payload.new;
      if (messageData.channel_id !== channelId) {
        processingMessage.current = false;
        isProcessingEvent.current = false;
        return true;
      }
      
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        if (payload.eventType === 'INSERT' && messagesMap.current.has(messageData.id)) {
          console.log(`[useRealtimeProcessor ${userRole.current}] Skipping duplicate message:`, messageData.id);
          processingMessage.current = false;
          isProcessingEvent.current = false;
          return true;
        }
        
        try {
          const { data: channelData } = await supabase
            .from('chat_channels')
            .select('channel_type')
            .eq('id', channelId)
            .single();
          
          await processMessage(messageData, channelData?.channel_type as 'group' | 'direct' || 'group');
          
          updateMessagesArray();
          
          console.log(`[useRealtimeProcessor ${userRole.current}] Realtime: Message added/updated:`, messageData.id);
        } catch (error) {
          console.error(`[useRealtimeProcessor ${userRole.current}] Error processing realtime message:`, error);
          return false;
        }
      } 
      else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old.id;
        if (messagesMap.current.has(deletedId)) {
          messagesMap.current.delete(deletedId);
          
          updateMessagesArray();
          console.log(`[useRealtimeProcessor ${userRole.current}] Realtime: Message deleted:`, deletedId);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`[useRealtimeProcessor ${userRole.current}] Error handling realtime message:`, error);
      return false;
    } finally {
      processingMessage.current = false;
      isProcessingEvent.current = false;
      
      // If there are more items in the queue, schedule processing the next one
      if (!isProcessingEvent.current && !processingMessage.current) {
        const nextItem = getNextFromQueue();
        if (nextItem) {
          processingTimeout.current = setTimeout(() => {
            processRealtimeEvent(nextItem, isProcessingEvent, getNextFromQueue, processingTimeout);
          }, 50);
        }
      }
    }
  }, [channelId, messagesMap, processingMessage, processMessage, updateMessagesArray, userRole]);

  return { processRealtimeEvent };
};
