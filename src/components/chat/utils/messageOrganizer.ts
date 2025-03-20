import { Message } from "@/types/messaging";
import { organizeMessageThreads } from './messageUtils';
import { useRef, useCallback, useMemo } from 'react';

export const useMessageOrganizer = (messages: Message[]) => {
  // Enhanced cache references with better stability
  const lastOrganizedMessages = useRef<Message[]>([]);
  const organizedCache = useRef<ReturnType<typeof organizeMessageThreads> | null>(null);
  const cacheVersion = useRef<number>(0);
  const processingFlag = useRef<boolean>(false);
  const messagesStableVersionRef = useRef<string>("");
  const lastOrganizationTimestamp = useRef<number>(0);
  const forceCooldownPeriod = useRef<boolean>(false);
  const messagesMappingRef = useRef<Map<string, true>>(new Map());
  const cooldownActive = useRef<boolean>(false);
  
  // Function for creating a stable representation of messages for comparison
  const createMessageSignature = useCallback((msgs: Message[]) => {
    if (msgs.length === 0) return "";
    
    // Only consider ID and reaction counts for performance (no deep comparison)
    return msgs.map(m => {
      const reactionCount = m.reactions ? Object.keys(m.reactions).length : 0;
      return `${m.id}-${reactionCount}`;
    }).join(',');
  }, []);
  
  // Enhanced message organization with improved caching and cooldown logic
  const organizeThreads = useCallback(() => {
    // Skip organization during active processing
    if (processingFlag.current) {
      return organizedCache.current || { rootMessages: [], messageThreads: {} };
    }
    
    // Use fixed cooldown periods to improve stability
    const now = Date.now();
    if (cooldownActive.current && now - lastOrganizationTimestamp.current < 1500) {
      return organizedCache.current || { rootMessages: [], messageThreads: {} };
    }
    
    // Set processing flag at the start
    processingFlag.current = true;
    
    try {
      // Quick reference check to avoid unnecessary work
      if (messages === lastOrganizedMessages.current && organizedCache.current) {
        return organizedCache.current;
      }
      
      // Create a stable signature to detect unchanged content
      const newSignature = createMessageSignature(messages);
      
      // Return cached result if signature is unchanged
      if (newSignature === messagesStableVersionRef.current && organizedCache.current) {
        return organizedCache.current;
      }
      
      // Build map of message IDs for fast lookups
      const newMessageMap = new Map<string, true>();
      messages.forEach(msg => newMessageMap.set(msg.id, true));
      
      // Check if messages array has the same elements (even if order changed)
      const sameMessages = messages.length === lastOrganizedMessages.current.length &&
        messages.every(msg => messagesMappingRef.current.has(msg.id)) &&
        lastOrganizedMessages.current.every(msg => newMessageMap.has(msg.id));
      
      // If content is identical, return cached result
      if (sameMessages && organizedCache.current && messagesStableVersionRef.current.length > 0) {
        return organizedCache.current;
      }
      
      // Organize threads if needed
      const result = organizeMessageThreads(messages);
      
      // Update all cache references
      lastOrganizedMessages.current = [...messages];
      organizedCache.current = result;
      cacheVersion.current += 1;
      messagesStableVersionRef.current = newSignature;
      messagesMappingRef.current = newMessageMap;
      lastOrganizationTimestamp.current = now;
      
      // Apply cooldown period for larger message sets
      if (messages.length > 5) {
        cooldownActive.current = true;
        setTimeout(() => {
          cooldownActive.current = false;
        }, 1500);
      }
      
      return result;
    } finally {
      // Release processing flag with delay for stability
      setTimeout(() => {
        processingFlag.current = false;
      }, 50);
    }
  }, [messages, createMessageSignature]);

  // Use memoization to ensure stable reference to organization result
  const organizedThreads = useMemo(() => {
    return organizeThreads();
  }, [organizeThreads, messages.length, cacheVersion.current]);

  return { 
    organizeThreads: () => organizedThreads,
    cacheVersion: cacheVersion.current
  };
};
