
import { Message } from "@/types/messaging";
import { organizeMessageThreads } from './messageUtils';
import { useRef, useCallback, useMemo } from 'react';

export const useMessageOrganizer = (messages: Message[]) => {
  // Stable cache references
  const lastOrganizedMessages = useRef<Message[]>([]);
  const organizedCache = useRef<ReturnType<typeof organizeMessageThreads> | null>(null);
  const cacheVersion = useRef<number>(0);
  const processingFlag = useRef<boolean>(false);
  const messagesStableVersionRef = useRef<string>("");
  const lastOrganizationTimestamp = useRef<number>(0);
  const forceCooldownPeriod = useRef<boolean>(false);
  
  // Enhanced function for organizing message threads with improved caching
  // to avoid costly reorganizations
  const organizeThreads = useCallback(() => {
    // Don't reorganize if already processing
    if (processingFlag.current) {
      return organizedCache.current || { rootMessages: [], messageThreads: {} };
    }
    
    // Simple cooldown mechanism to prevent too frequent reorganizations
    const now = Date.now();
    if (forceCooldownPeriod.current && now - lastOrganizationTimestamp.current < 2000) {
      return organizedCache.current || { rootMessages: [], messageThreads: {} };
    }
    
    processingFlag.current = true;
    
    try {
      // Quick reference check for performance
      if (messages === lastOrganizedMessages.current && organizedCache.current) {
        return organizedCache.current;
      }
      
      // Create a stable signature of messages for comparison
      const newMessagesStableVersion = messages.length > 0 ? 
        messages.map(m => `${m.id}-${m.reactions ? Object.keys(m.reactions).length : 0}`).join(',') : "";
      
      // If the signature is the same, use the cache
      if (newMessagesStableVersion === messagesStableVersionRef.current && organizedCache.current) {
        return organizedCache.current;
      }
      
      // Deep equality check (based only on ID and reactions count for performance)
      const sameMessageList = messages.length === lastOrganizedMessages.current.length &&
        messages.every((msg, i) => {
          const prevMsg = lastOrganizedMessages.current[i];
          if (!prevMsg || msg.id !== prevMsg.id) return false;
          
          // Also check reactions since they affect thread display
          const msgReactionCount = msg.reactions ? Object.keys(msg.reactions).length : 0;
          const prevReactionCount = prevMsg.reactions ? Object.keys(prevMsg.reactions).length : 0;
          
          return msgReactionCount === prevReactionCount;
        });
      
      if (sameMessageList && organizedCache.current) {
        return organizedCache.current;
      }
      
      // If messages have changed, reorganize and update cache
      const result = organizeMessageThreads(messages);
      
      // Update the cache
      lastOrganizedMessages.current = [...messages];
      organizedCache.current = result;
      cacheVersion.current += 1;
      messagesStableVersionRef.current = newMessagesStableVersion;
      lastOrganizationTimestamp.current = now;
      
      // After a significant change, enforce a cooldown period
      if (result.rootMessages.length > 5) {
        forceCooldownPeriod.current = true;
        setTimeout(() => {
          forceCooldownPeriod.current = false;
        }, 2000);
      }
      
      return result;
    } finally {
      // Ensure the flag is released even in case of error
      setTimeout(() => {
        processingFlag.current = false;
      }, 50);
    }
  }, [messages]);

  // Use memoization to further stabilize the result
  const organizedThreads = useMemo(() => {
    return organizeThreads();
  }, [organizeThreads, cacheVersion.current]);

  return { 
    organizeThreads: () => organizedThreads,
    cacheVersion: cacheVersion.current
  };
};
