
import { useCallback, useRef } from 'react';

export const useForceFetch = (
  userRole: React.MutableRefObject<string>,
  processingMessage: React.MutableRefObject<boolean>,
  messagesMap: React.MutableRefObject<Map<string, any>>,
  updateMessagesArray: () => void,
  clearQueue: () => void,
  fetchMessages: () => Promise<void>
) => {
  const forceFetchInProgress = useRef(false);

  const forceFetch = useCallback(() => {
    if (forceFetchInProgress.current) {
      console.log(`[useForceFetch ${userRole.current}] Force fetch already in progress, skipping`);
      return;
    }
    
    console.log(`[useForceFetch ${userRole.current}] Force fetching messages`);
    forceFetchInProgress.current = true;
    
    clearQueue();
    processingMessage.current = false;
    
    return fetchMessages().finally(() => {
      console.log(`[useForceFetch ${userRole.current}] Force fetch completed`);
      forceFetchInProgress.current = false;
      
      setTimeout(() => {
        if (messagesMap.current.size > 0) {
          console.log(`[useForceFetch ${userRole.current}] Running post-fetch update`);
          updateMessagesArray();
        }
      }, 500);
    });
  }, [fetchMessages, userRole, processingMessage, messagesMap, updateMessagesArray, clearQueue]);

  return {
    forceFetchInProgress,
    forceFetch
  };
};
