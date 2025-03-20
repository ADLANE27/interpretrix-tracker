
import { useState, useCallback, useRef } from 'react';
import { Message } from '@/types/messaging';

export const useMessageMap = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesMap = useRef<Map<string, Message>>(new Map());
  const updateCounter = useRef<number>(0);
  const updateScheduled = useRef<boolean>(false);
  const messagesVersion = useRef<number>(0);
  
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
        return;
      }

      const updatedMessages = Array.from(messagesMap.current.values())
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      // Don't update if nothing changed (prevents re-renders)
      if (messages.length === updatedMessages.length && 
          messages.every((m, i) => m.id === updatedMessages[i].id)) {
        console.log(`[useMessageMap] Update ${currentUpdateId}: Messages unchanged, skipping update`);
        return;
      }
      
      console.log(`[useMessageMap] Update ${currentUpdateId}: Updating messages array with ${updatedMessages.length} messages`);
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
    messagesVersion
  };
};
