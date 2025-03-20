
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
  const messageSignature = useRef<string>("");
  const minUpdateInterval = useRef<number>(300);
  const lastUpdateTime = useRef<number>(0);
  
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
  
  // Create a signature of the current messages
  const createMessageSignature = useCallback((msgs: Message[]) => {
    if (msgs.length === 0) return "";
    return msgs.slice(0, Math.min(20, msgs.length)).map(m => m.id).join(',');
  }, []);
  
  // More efficient message array update with throttling
  const updateMessagesArray = useCallback(() => {
    // Skip if locked or no changes needed
    if (updateLock.current) return;
    
    // Check timing for throttling
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTime.current;
    
    // Apply throttling if updates are too frequent
    if (timeSinceLastUpdate < minUpdateInterval.current && updateScheduled.current) {
      return;
    }
    
    // Track update attempt
    updateCounter.current += 1;
    messagesVersion.current += 1;
    
    // Avoid scheduling duplicate updates
    if (updateScheduled.current) return;
    
    // Clean up existing timers
    if (batchUpdateTimer.current) {
      clearTimeout(batchUpdateTimer.current);
      batchUpdateTimer.current = null;
    }
    
    if (debounceUpdateTimer.current) {
      clearTimeout(debounceUpdateTimer.current);
      debounceUpdateTimer.current = null;
    }
    
    // Set flags for tracking update state
    updateScheduled.current = true;
    updateLock.current = true;
    
    // Use fixed delay for update stability
    batchUpdateTimer.current = setTimeout(() => {
      updateScheduled.current = false;
      batchUpdateTimer.current = null;
      
      // Skip empty updates
      if (messagesMap.current.size === 0 && messages.length === 0) {
        updateLock.current = false;
        return;
      }

      // Set empty array if no messages
      if (messagesMap.current.size === 0) {
        setMessages([]);
        lastSortedMessages.current = [];
        lastUpdateTime.current = Date.now();
        
        // Release lock after delay
        setTimeout(() => {
          updateLock.current = false;
        }, 50);
        return;
      }

      // Sort messages consistently
      const updatedMessages = Array.from(messagesMap.current.values())
        .sort((a, b) => {
          // Primary sort by timestamp
          const timeA = normalizeTimestampForSorting(a.timestamp);
          const timeB = normalizeTimestampForSorting(b.timestamp);
          
          if (timeA === timeB) {
            // Secondary sort by ID
            return a.id.localeCompare(b.id);
          }
          
          return timeA - timeB;
        });
      
      // Create message signature for change detection
      const newSignature = createMessageSignature(updatedMessages);
      const signatureChanged = newSignature !== messageSignature.current;
      
      // Check for actual changes before updating state
      const messagesChanged = 
        signatureChanged ||
        updatedMessages.length !== lastSortedMessages.current.length;
      
      // Only update if there are changes
      if (messagesChanged) {
        lastSortedMessages.current = updatedMessages;
        messageSignature.current = newSignature;
        
        // Update state with new message array
        setMessages([...updatedMessages]);
        lastUpdateTime.current = Date.now();
        
        // Schedule a follow-up update for consistency
        setTimeout(() => {
          if (!updateLock.current) return;
          
          debounceUpdateTimer.current = setTimeout(() => {
            debounceUpdateTimer.current = null;
            updateLock.current = false;
          }, 200);
        }, 100);
      } else {
        // Release lock if no changes
        setTimeout(() => {
          updateLock.current = false;
        }, 50);
      }
    }, minUpdateInterval.current);
    
  }, [messages, createMessageSignature]);

  return {
    messages,
    setMessages,
    messagesMap,
    updateMessagesArray,
    updateCounter,
    updateScheduled,
    messagesVersion,
    lastSortedMessages,
    pendingUpdates,
    messageSignature
  };
};
