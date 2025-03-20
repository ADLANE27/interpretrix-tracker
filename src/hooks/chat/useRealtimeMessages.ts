
import { useCallback, useState, useRef, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useMessageProcessing } from './useMessageProcessing';
import { RealtimeMessageHandler } from './types/chatHooks';
import { toast } from "@/hooks/use-toast";

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
  const isProcessingEvent = useRef(false);
  const cooldownPeriod = useRef(false);
  const processQueue = useRef<Array<any>>([]);
  const processingTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Process messages in queue one by one to avoid race conditions
  const processNextInQueue = useCallback(async () => {
    if (processingMessage.current || isProcessingEvent.current || processQueue.current.length === 0) {
      if (processingTimeout.current) {
        clearTimeout(processingTimeout.current);
        processingTimeout.current = null;
      }
      return;
    }
    
    isProcessingEvent.current = true;
    processingMessage.current = true;
    
    try {
      const payload = processQueue.current.shift();
      console.log(`[useRealtimeMessages ${userRole.current}] Processing queued message:`, payload?.eventType);
      
      if (!payload || !payload.new || !channelId) {
        processingMessage.current = false;
        isProcessingEvent.current = false;
        
        // Schedule next item processing
        if (processQueue.current.length > 0) {
          processingTimeout.current = setTimeout(processNextInQueue, 100);
        }
        return;
      }
      
      const messageData = payload.new;
      if (messageData.channel_id !== channelId) {
        processingMessage.current = false;
        isProcessingEvent.current = false;
        
        // Schedule next item processing
        if (processQueue.current.length > 0) {
          processingTimeout.current = setTimeout(processNextInQueue, 100);
        }
        return;
      }
      
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        if (payload.eventType === 'INSERT' && messagesMap.current.has(messageData.id)) {
          console.log(`[useRealtimeMessages ${userRole.current}] Skipping duplicate message:`, messageData.id);
          processingMessage.current = false;
          isProcessingEvent.current = false;
          
          // Schedule next item processing
          if (processQueue.current.length > 0) {
            processingTimeout.current = setTimeout(processNextInQueue, 100);
          }
          return;
        }
        
        try {
          // Get channel type for proper processing
          const { data: channelData } = await supabase
            .from('chat_channels')
            .select('channel_type')
            .eq('id', channelId)
            .single();
          
          // Process the message
          await processMessage(messageData, channelData?.channel_type as 'group' | 'direct' || 'group');
          
          // Update the messages array
          updateMessagesArray();
          
          console.log(`[useRealtimeMessages ${userRole.current}] Realtime: Message added/updated:`, messageData.id);
          
          setLastFetchTime(new Date());
        } catch (error) {
          console.error(`[useRealtimeMessages ${userRole.current}] Error processing realtime message:`, error);
          
          if (!cooldownPeriod.current) {
            cooldownPeriod.current = true;
            setTimeout(() => {
              forceFetch();
              cooldownPeriod.current = false;
            }, 2000);
          }
        }
      } 
      else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old.id;
        if (messagesMap.current.has(deletedId)) {
          messagesMap.current.delete(deletedId);
          
          // Update the messages array
          updateMessagesArray();
          console.log(`[useRealtimeMessages ${userRole.current}] Realtime: Message deleted:`, deletedId);
        }
      }
    } catch (error) {
      console.error(`[useRealtimeMessages ${userRole.current}] Error handling realtime message:`, error);
    } finally {
      processingMessage.current = false;
      isProcessingEvent.current = false;
      
      // Schedule next item processing with a small delay
      if (processQueue.current.length > 0) {
        processingTimeout.current = setTimeout(processNextInQueue, 100);
      }
    }
  }, [channelId, messagesMap, processingMessage, userRole, processMessage, updateMessagesArray, forceFetch]);
  
  const handleRealtimeMessage = useCallback(async (payload: any) => {
    // Add message to processing queue instead of processing immediately
    console.log(`[useRealtimeMessages ${userRole.current}] Received realtime message:`, payload.eventType);
    
    // Add to queue
    processQueue.current.push(payload);
    
    // Start processing if not already processing
    if (!isProcessingEvent.current && !processingMessage.current && !processingTimeout.current) {
      processingTimeout.current = setTimeout(processNextInQueue, 50);
    }
  }, [userRole, processNextInQueue]);

  const forceFetch = useCallback(() => {
    console.log(`[useRealtimeMessages ${userRole.current}] Force fetching messages`);
    // Clear any processing state to avoid deadlocks
    if (processingTimeout.current) {
      clearTimeout(processingTimeout.current);
      processingTimeout.current = null;
    }
    isProcessingEvent.current = false;
    processingMessage.current = false;
    processQueue.current = [];
    
    return fetchMessages();
  }, [fetchMessages, userRole]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processingTimeout.current) {
        clearTimeout(processingTimeout.current);
      }
    };
  }, []);

  return {
    lastFetchTime,
    setLastFetchTime,
    retryCount,
    setRetryCount,
    handleRealtimeMessage,
    forceFetch
  };
};
