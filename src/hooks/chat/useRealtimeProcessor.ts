
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
    // Skip if already processing
    if (processingMessage.current || isProcessingEvent.current) {
      return false;
    }
    
    // Set flags to prevent concurrent processing
    isProcessingEvent.current = true;
    processingMessage.current = true;
    
    try {
      // Validate payload
      if (!payload || !payload.new || !channelId) {
        return true;
      }
      
      const messageData = payload.new;
      
      // Skip if message is for different channel
      if (messageData.channel_id !== channelId) {
        return true;
      }
      
      // Handle message insert or update
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        // Skip duplicates for inserts
        if (payload.eventType === 'INSERT' && messagesMap.current.has(messageData.id)) {
          console.log(`[useRealtimeProcessor ${userRole.current}] Skipping duplicate message:`, messageData.id);
          return true;
        }
        
        try {
          // Get channel type once
          const { data: channelData } = await supabase
            .from('chat_channels')
            .select('channel_type')
            .eq('id', channelId)
            .single();
          
          // Process the message
          await processMessage(messageData, channelData?.channel_type as 'group' | 'direct' || 'group');
          
          // Single update with delay instead of multiple
          setTimeout(() => {
            updateMessagesArray();
          }, 100);
          
          console.log(`[useRealtimeProcessor ${userRole.current}] Message processed:`, messageData.id);
        } catch (error) {
          console.error(`[useRealtimeProcessor ${userRole.current}] Error processing message:`, error);
          return false;
        }
      } 
      // Handle message deletion
      else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old.id;
        
        // Remove from map and update UI
        if (messagesMap.current.has(deletedId)) {
          messagesMap.current.delete(deletedId);
          
          // Single update with delay
          setTimeout(() => {
            updateMessagesArray();
          }, 100);
          
          console.log(`[useRealtimeProcessor ${userRole.current}] Message deleted:`, deletedId);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`[useRealtimeProcessor ${userRole.current}] Error handling event:`, error);
      return false;
    } finally {
      // Release locks with sequential delays
      setTimeout(() => {
        processingMessage.current = false;
        
        // Release event lock after processing lock
        setTimeout(() => {
          isProcessingEvent.current = false;
          
          // Process next item with adequate delay
          const nextItem = getNextFromQueue();
          if (nextItem) {
            processingTimeout.current = setTimeout(() => {
              processRealtimeEvent(nextItem, isProcessingEvent, getNextFromQueue, processingTimeout);
            }, 500);
          }
        }, 200);
      }, 300);
    }
  }, [channelId, messagesMap, processingMessage, processMessage, updateMessagesArray, userRole]);

  return { processRealtimeEvent };
};
