
import { useState, useCallback, useRef, useEffect } from 'react';
import { Message } from '@/types/messaging';
import { normalizeTimestampForSorting } from '@/utils/dateTimeUtils';

export const useMessageMap = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesMap = useRef<Map<string, Message>>(new Map());
  const updateCounter = useRef<number>(0);
  const updateScheduled = useRef<boolean>(false);
  const messagesVersion = useRef<number>(0);
  const lastSortedMessages = useRef<Message[]>([]);
  const batchUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  const debounceUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdates = useRef<Set<string>>(new Set());
  const updateLock = useRef<boolean>(false);
  
  // Clean up function for timers
  useEffect(() => {
    return () => {
      if (batchUpdateTimer.current) {
        clearTimeout(batchUpdateTimer.current);
        batchUpdateTimer.current = null;
      }
      
      if (debounceUpdateTimer.current) {
        clearTimeout(debounceUpdateTimer.current);
        debounceUpdateTimer.current = null;
      }
    };
  }, []);
  
  // Rate-limited update of messages array to avoid too frequent renders
  const updateMessagesArray = useCallback(() => {
    // Skip if already locked
    if (updateLock.current) {
      return;
    }
    
    updateCounter.current += 1;
    const currentUpdateId = updateCounter.current;
    messagesVersion.current += 1;
    
    // Avoid updates that are too frequent
    if (updateScheduled.current) {
      return;
    }
    
    // Clean up existing timers to avoid conflicts
    if (batchUpdateTimer.current) {
      clearTimeout(batchUpdateTimer.current);
      batchUpdateTimer.current = null;
    }
    
    if (debounceUpdateTimer.current) {
      clearTimeout(debounceUpdateTimer.current);
      debounceUpdateTimer.current = null;
    }
    
    updateScheduled.current = true;
    updateLock.current = true;
    
    // Use setTimeout instead of requestAnimationFrame for better stability
    batchUpdateTimer.current = setTimeout(() => {
      updateScheduled.current = false;
      batchUpdateTimer.current = null;
      
      // Don't update if there are no messages and we've already set an empty array
      if (messagesMap.current.size === 0 && messages.length === 0) {
        console.log(`[useMessageMap] Update ${currentUpdateId}: No messages, skipping update`);
        updateLock.current = false;
        return;
      }

      if (messagesMap.current.size === 0) {
        console.log(`[useMessageMap] Update ${currentUpdateId}: Setting empty messages array`);
        setMessages([]);
        lastSortedMessages.current = [];
        
        // Release lock after a short delay
        setTimeout(() => {
          updateLock.current = false;
        }, 50);
        return;
      }

      // Sort messages by normalized timestamp for better consistency
      const updatedMessages = Array.from(messagesMap.current.values())
        .sort((a, b) => {
          // Stable and consistent sort by timestamp
          const timeA = normalizeTimestampForSorting(a.timestamp);
          const timeB = normalizeTimestampForSorting(b.timestamp);
          
          if (timeA === timeB) {
            // Secondary sort by ID to ensure uniqueness
            return a.id.localeCompare(b.id);
          }
          
          return timeA - timeB;
        });
      
      // Check if messages have actually changed to avoid unnecessary renders
      // Use a more robust comparison system
      const messagesChanged = 
        updatedMessages.length !== lastSortedMessages.current.length ||
        updatedMessages.some((msg, idx) => {
          const prevMsg = lastSortedMessages.current[idx];
          // More thorough change detection
          return !prevMsg || 
                 msg.id !== prevMsg.id || 
                 (msg.reactions && JSON.stringify(msg.reactions) !== JSON.stringify(prevMsg.reactions)) ||
                 (msg.attachments && msg.attachments.length !== prevMsg.attachments.length);
        });
      
      // Only update if something has changed
      if (messagesChanged) {
        console.log(`[useMessageMap] Update ${currentUpdateId}: Updating messages array with ${updatedMessages.length} messages`);
        lastSortedMessages.current = updatedMessages;
        
        // Batch operation: one setter instead of multiple
        setMessages([...updatedMessages]); // Create a new reference to ensure re-render
        
        // Schedule a second update after a delay to ensure consistency
        // but only if the lock is still active for this update
        setTimeout(() => {
          if (!updateLock.current) return;
          
          debounceUpdateTimer.current = setTimeout(() => {
            debounceUpdateTimer.current = null;
            // Release lock
            updateLock.current = false;
          }, 300);
        }, 100);
      } else {
        console.log(`[useMessageMap] Update ${currentUpdateId}: Messages unchanged, skipping update`);
        // Release lock after a short delay
        setTimeout(() => {
          updateLock.current = false;
        }, 50);
      }
    }, 300); // Longer delay for stability
    
  }, [messages]);

  return {
    messages,
    setMessages,
    messagesMap,
    updateMessagesArray,
    updateCounter,
    updateScheduled,
    messagesVersion,
    lastSortedMessages,
    pendingUpdates
  };
};
