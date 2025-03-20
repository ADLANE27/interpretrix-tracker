import { useState, useCallback, useRef } from 'react';
import { Message } from '@/types/messaging';
import { normalizeTimestampForSorting } from '@/utils/dateTimeUtils';

export const useMessageMap = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesMap = useRef<Map<string, Message>>(new Map());
  const updateCounter = useRef<number>(0);
  const updateScheduled = useRef<boolean>(false);
  const messagesVersion = useRef<number>(0);
  const lastSortedMessages = useRef<Message[]>([]);
  
  // Update messages array with debouncing to prevent too many state updates
  const updateMessagesArray = useCallback(() => {
    updateCounter.current += 1;
    const currentUpdateId = updateCounter.current;
    messagesVersion.current += 1;
    const currentVersion = messagesVersion.current;
    
    if (updateScheduled.current) {
      // Already scheduled an update, just mark we have more pending updates
      return;
    }
    
    updateScheduled.current = true;
    
    // Use requestAnimationFrame for smoother UI updates
    requestAnimationFrame(() => {
      // If the version has changed during the animation frame, don't update
      if (currentVersion !== messagesVersion.current) {
        updateScheduled.current = false;
        return;
      }
      
      updateScheduled.current = false;
      
      // Don't update if there are no messages and we've already set empty array
      if (messagesMap.current.size === 0 && messages.length === 0) {
        console.log(`[useMessageMap] Update ${currentUpdateId}: No messages, skipping update`);
        return;
      }

      if (messagesMap.current.size === 0) {
        console.log(`[useMessageMap] Update ${currentUpdateId}: Setting empty messages array`);
        setMessages([]);
        lastSortedMessages.current = [];
        return;
      }

      // Sort messages by their normalized timestamp for consistency
      const updatedMessages = Array.from(messagesMap.current.values())
        .sort((a, b) => {
          const timeA = normalizeTimestampForSorting(a.timestamp);
          const timeB = normalizeTimestampForSorting(b.timestamp);
          return timeA - timeB;
        });
      
      // Keep a stable reference to avoid unnecessary re-renders
      const messagesChanged = 
        updatedMessages.length !== lastSortedMessages.current.length ||
        updatedMessages.some((msg, idx) => {
          const prevMsg = lastSortedMessages.current[idx];
          return !prevMsg || msg.id !== prevMsg.id;
        });
      
      // Don't update if nothing changed (prevents re-renders)
      if (!messagesChanged) {
        console.log(`[useMessageMap] Update ${currentUpdateId}: Messages unchanged, skipping update`);
        return;
      }
      
      console.log(`[useMessageMap] Update ${currentUpdateId}: Updating messages array with ${updatedMessages.length} messages`);
      lastSortedMessages.current = updatedMessages;
      setMessages(updatedMessages);
    });
  }, [messages]);

  return {
    messages,
    setMessages,
    messagesMap,
    updateMessagesArray,
    updateCounter,
    updateScheduled,
    messagesVersion,
    lastSortedMessages
  };
};
