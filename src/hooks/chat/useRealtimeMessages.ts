
import { useCallback, useState, useEffect } from 'react';
import { useMessageProcessing } from './useMessageProcessing';
import { toast } from "@/hooks/use-toast";
import { useMessageQueue } from './useMessageQueue';
import { useRealtimeProcessor } from './useRealtimeProcessor';
import { useForceFetch } from './useForceFetch';
import { useCooldown } from './useCooldown';

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
  
  // Queue management
  const {
    isProcessingEvent,
    processingTimeout,
    addToQueue,
    clearQueue,
    isQueueEmpty,
    getNextFromQueue
  } = useMessageQueue(userRole, processingMessage);
  
  // Cooldown handling
  const { cooldownPeriod, startCooldown } = useCooldown(userRole);
  
  // Force fetch handling
  const { forceFetchInProgress, forceFetch } = useForceFetch(
    userRole,
    processingMessage,
    messagesMap,
    updateMessagesArray,
    clearQueue,
    fetchMessages
  );
  
  // Realtime event processing
  const { processRealtimeEvent } = useRealtimeProcessor(
    channelId,
    userRole,
    messagesMap,
    processingMessage,
    processMessage,
    updateMessagesArray
  );
  
  // Process next message in queue
  const processNextInQueue = useCallback(async () => {
    if (processingMessage.current || isProcessingEvent.current || isQueueEmpty()) {
      if (processingTimeout.current) {
        clearTimeout(processingTimeout.current);
        processingTimeout.current = null;
      }
      return;
    }
    
    const payload = getNextFromQueue();
    console.log(`[useRealtimeMessages ${userRole.current}] Processing queued message:`, payload?.eventType);
    
    const success = await processRealtimeEvent(
      payload, 
      isProcessingEvent, 
      getNextFromQueue, 
      processingTimeout
    );
    
    if (!success && !cooldownPeriod.current) {
      startCooldown(() => {
        forceFetch();
      });
    }
    
    if (!isQueueEmpty()) {
      processingTimeout.current = setTimeout(processNextInQueue, 100);
    }
  }, [
    processingMessage, 
    isProcessingEvent, 
    isQueueEmpty, 
    processingTimeout, 
    getNextFromQueue, 
    userRole, 
    processRealtimeEvent, 
    cooldownPeriod, 
    startCooldown, 
    forceFetch
  ]);
  
  // Handle new realtime messages
  const handleRealtimeMessage = useCallback(async (payload: any) => {
    console.log(`[useRealtimeMessages ${userRole.current}] Received realtime message:`, payload.eventType);
    
    addToQueue(payload);
    
    if (!isProcessingEvent.current && !processingMessage.current && !processingTimeout.current) {
      processingTimeout.current = setTimeout(processNextInQueue, 50);
    }
  }, [userRole, addToQueue, isProcessingEvent, processingMessage, processingTimeout, processNextInQueue]);
  
  // Initial fetch when channel changes
  useEffect(() => {
    if (channelId) {
      setTimeout(() => {
        console.log(`[useRealtimeMessages ${userRole.current}] Initial force fetch for channel: ${channelId}`);
        forceFetch();
      }, 50);
    }
  }, [channelId, forceFetch, userRole]);
  
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
