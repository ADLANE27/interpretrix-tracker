
import { useLayoutEffect } from 'react';
import { Message } from "@/types/messaging";

export const useMessageScroll = (
  messages: Message[],
  isInitialLoad: boolean,
  lastMessageCountRef: React.MutableRefObject<number>,
  messagesEndRef: React.MutableRefObject<HTMLDivElement | null>,
  scrollToBottomFlag: React.MutableRefObject<boolean>,
  messageContainerRef: React.MutableRefObject<HTMLDivElement | null>
) => {
  // Use useLayoutEffect to ensure scrolling happens before visual render
  useLayoutEffect(() => {
    if (!messageContainerRef.current || messages.length === 0) return;
    
    const isNewMessageBatch = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;
    
    // Determine if we should scroll to bottom
    const shouldScrollToBottom = scrollToBottomFlag.current || isNewMessageBatch || isInitialLoad;
    
    if (shouldScrollToBottom && messagesEndRef.current) {
      // Use a two-phase scroll system for reliability
      // First immediate scroll for approximate position
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'auto',
        block: 'end'
      });
      
      // Second scroll with requestAnimationFrame for precision
      requestAnimationFrame(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ 
            behavior: isInitialLoad ? 'auto' : 'smooth',
            block: 'end'
          });
          
          // Reset the flag after scrolling
          if (scrollToBottomFlag.current) {
            scrollToBottomFlag.current = false;
          }
        }
      });
    }
  }, [messages, isInitialLoad, messagesEndRef, lastMessageCountRef, scrollToBottomFlag, messageContainerRef]);
};
