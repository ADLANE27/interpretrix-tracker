
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
    // Avoid concurrent processing
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
        // Avoid duplicates
        if (payload.eventType === 'INSERT' && messagesMap.current.has(messageData.id)) {
          console.log(`[useRealtimeProcessor ${userRole.current}] Skipping duplicate message:`, messageData.id);
          processingMessage.current = false;
          isProcessingEvent.current = false;
          return true;
        }
        
        try {
          // Get channel type
          const { data: channelData } = await supabase
            .from('chat_channels')
            .select('channel_type')
            .eq('id', channelId)
            .single();
          
          // Process the message
          await processMessage(messageData, channelData?.channel_type as 'group' | 'direct' || 'group');
          
          // Staggered UI updates for stability
          // Wait before doing the first update
          setTimeout(() => {
            // First update
            updateMessagesArray();
            
            // Second update after a delay
            setTimeout(() => {
              updateMessagesArray();
            }, 300);
          }, 100);
          
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
          
          // Staggered updates for stability
          setTimeout(() => {
            updateMessagesArray();
            
            // Additional update for consistency
            setTimeout(() => { 
              updateMessagesArray(); 
            }, 300);
          }, 100);
          
          console.log(`[useRealtimeProcessor ${userRole.current}] Realtime: Message deleted:`, deletedId);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`[useRealtimeProcessor ${userRole.current}] Error handling realtime message:`, error);
      return false;
    } finally {
      // Progressive lock release to avoid conflicts
      // Release the processing message lock first
      setTimeout(() => {
        processingMessage.current = false;
      }, 300);
      
      // Then release the event processing lock
      setTimeout(() => {
        isProcessingEvent.current = false;
      }, 400);
      
      // If there are more items in the queue, schedule processing the next one with a longer delay
      if (!isProcessingEvent.current && !processingMessage.current) {
        const nextItem = getNextFromQueue();
        if (nextItem) {
          // Increased delay for more stability
          processingTimeout.current = setTimeout(() => {
            processRealtimeEvent(nextItem, isProcessingEvent, getNextFromQueue, processingTimeout);
          }, 600);
        }
      }
    }
  }, [channelId, messagesMap, processingMessage, processMessage, updateMessagesArray, userRole]);

  return { processRealtimeEvent };
};
