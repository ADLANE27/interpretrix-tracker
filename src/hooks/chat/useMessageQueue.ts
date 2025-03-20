
import { useCallback, useRef } from 'react';

export const useMessageQueue = (
  userRole: React.MutableRefObject<string>,
  processingMessage: React.MutableRefObject<boolean>
) => {
  const isProcessingEvent = useRef(false);
  const processQueue = useRef<Array<any>>([]);
  const processingTimeout = useRef<NodeJS.Timeout | null>(null);
  const queueThrottleTimer = useRef<NodeJS.Timeout | null>(null);
  const lastProcessTime = useRef<number>(0);
  const minProcessInterval = useRef<number>(300);
  
  // Add message to queue with throttling
  const addToQueue = useCallback((payload: any) => {
    // Skip duplicate events already in queue
    const isDuplicate = processQueue.current.some(item => 
      item.eventType === payload.eventType && 
      item.new?.id === payload.new?.id
    );
    
    if (isDuplicate && payload.eventType === 'INSERT') {
      return;
    }
    
    console.log(`[useMessageQueue ${userRole.current}] Adding to queue:`, payload.eventType);
    processQueue.current.push(payload);
    
    // Limit queue size to prevent memory issues
    if (processQueue.current.length > 50) {
      processQueue.current = processQueue.current.slice(-50);
    }
  }, [userRole]);
  
  // Clear queue and timers
  const clearQueue = useCallback(() => {
    console.log(`[useMessageQueue ${userRole.current}] Clearing queue`);
    processQueue.current = [];
    
    if (processingTimeout.current) {
      clearTimeout(processingTimeout.current);
      processingTimeout.current = null;
    }
    
    if (queueThrottleTimer.current) {
      clearTimeout(queueThrottleTimer.current);
      queueThrottleTimer.current = null;
    }
    
    isProcessingEvent.current = false;
  }, [userRole]);
  
  // Check if queue is empty
  const isQueueEmpty = useCallback(() => {
    return processQueue.current.length === 0;
  }, []);
  
  // Get next item with throttling
  const getNextFromQueue = useCallback(() => {
    if (processQueue.current.length === 0) return null;
    
    // Apply throttling to event processing
    const now = Date.now();
    if (now - lastProcessTime.current < minProcessInterval.current) {
      // Schedule deferred processing
      if (!queueThrottleTimer.current) {
        queueThrottleTimer.current = setTimeout(() => {
          queueThrottleTimer.current = null;
          lastProcessTime.current = Date.now();
          return processQueue.current.shift();
        }, minProcessInterval.current);
      }
      return null;
    }
    
    // Update last process time
    lastProcessTime.current = now;
    return processQueue.current.shift();
  }, []);
  
  return {
    isProcessingEvent,
    processQueue,
    processingTimeout,
    addToQueue,
    clearQueue,
    isQueueEmpty,
    getNextFromQueue
  };
};
