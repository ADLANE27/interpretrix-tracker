
import { useCallback, useRef } from 'react';
import { useMessageProcessing } from './useMessageProcessing';

export const useMessageQueue = (
  userRole: React.MutableRefObject<string>,
  processingMessage: React.MutableRefObject<boolean>
) => {
  const isProcessingEvent = useRef(false);
  const processQueue = useRef<Array<any>>([]);
  const processingTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const addToQueue = useCallback((payload: any) => {
    console.log(`[useMessageQueue ${userRole.current}] Adding message to queue:`, payload.eventType);
    processQueue.current.push(payload);
  }, [userRole]);
  
  const clearQueue = useCallback(() => {
    console.log(`[useMessageQueue ${userRole.current}] Clearing message queue`);
    processQueue.current = [];
    
    if (processingTimeout.current) {
      clearTimeout(processingTimeout.current);
      processingTimeout.current = null;
    }
    
    isProcessingEvent.current = false;
  }, [userRole]);
  
  const isQueueEmpty = useCallback(() => {
    return processQueue.current.length === 0;
  }, []);
  
  const getNextFromQueue = useCallback(() => {
    if (processQueue.current.length === 0) return null;
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
