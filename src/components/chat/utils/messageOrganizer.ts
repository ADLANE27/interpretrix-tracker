
import { Message } from "@/types/messaging";
import { organizeMessageThreads } from './messageUtils';
import { useRef, useCallback } from 'react';

export const useMessageOrganizer = (messages: Message[]) => {
  const lastOrganizedMessages = useRef<Message[]>([]);
  const organizedCache = useRef<ReturnType<typeof organizeMessageThreads> | null>(null);
  const cacheVersion = useRef<number>(0);
  
  // Simplified function to organize message threads
  // With caching to avoid expensive reorganizations if messages haven't changed
  const organizeThreads = useCallback(() => {
    // Check if we have the same messages (by reference comparison first for speed)
    if (messages === lastOrganizedMessages.current) {
      return organizedCache.current || organizeMessageThreads(messages);
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
  }, [messages]);

  return { organizeThreads };
};
