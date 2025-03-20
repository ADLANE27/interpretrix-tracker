
import { Message } from "@/types/messaging";
import { organizeMessageThreads } from './messageUtils';
import { useRef, useCallback } from 'react';

export const useMessageOrganizer = (messages: Message[]) => {
  const lastOrganizedMessages = useRef<Message[]>([]);
  const organizedCache = useRef<ReturnType<typeof organizeMessageThreads> | null>(null);
  const cacheVersion = useRef<number>(0);
  const processingFlag = useRef<boolean>(false);
  
  // Improved function to organize message threads with strong caching
  // to avoid expensive reorganizations
  const organizeThreads = useCallback(() => {
    // Don't reorganize if already processing
    if (processingFlag.current) {
      return organizedCache.current || { rootMessages: [], messageThreads: {} };
    }
    
    processingFlag.current = true;
    
    try {
      // Check if we have the same messages (by reference comparison first for speed)
      if (messages === lastOrganizedMessages.current && organizedCache.current) {
        return organizedCache.current;
      }
      
      // Deep equality check (only id-based for performance)
      const sameMessageList = messages.length === lastOrganizedMessages.current.length &&
        messages.every((msg, i) => msg.id === lastOrganizedMessages.current[i]?.id);
      
      if (sameMessageList && organizedCache.current) {
        return organizedCache.current;
      }
      
      // If messages changed, reorganize and update cache
      const result = organizeMessageThreads(messages);
      lastOrganizedMessages.current = [...messages];
      organizedCache.current = result;
      cacheVersion.current += 1;
      
      return result;
    } finally {
      // Ensure the flag is released even if there's an error
      processingFlag.current = false;
    }
  }, [messages]);

  return { 
    organizeThreads,
    cacheVersion: cacheVersion.current
  };
};
