
import { useLayoutEffect, useRef } from 'react';
import { Message } from "@/types/messaging";

export const useMessageScroll = (
  messages: Message[],
  isInitialLoad: boolean,
  lastMessageCountRef: React.MutableRefObject<number>,
  messagesEndRef: React.MutableRefObject<HTMLDivElement | null>,
  scrollToBottomFlag: React.MutableRefObject<boolean>,
  messageContainerRef: React.MutableRefObject<HTMLDivElement | null>
) => {
  const isScrolling = useRef(false);
  const lastScrollTop = useRef(0);
  
  // Use useLayoutEffect to ensure scrolling happens before visual render
  useLayoutEffect(() => {
    if (!messageContainerRef.current || messages.length === 0 || isScrolling.current) return;
    
    const isNewMessageBatch = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;
    
    // Store current scroll position
    if (messageContainerRef.current) {
      lastScrollTop.current = messageContainerRef.current.scrollTop;
    }
    
    // Determine if we should scroll to bottom
    const container = messageContainerRef.current;
    const userWasAtBottom = container && 
      (container.scrollHeight - container.scrollTop - container.clientHeight < 80);
    
    const shouldScrollToBottom = scrollToBottomFlag.current || 
                               (isNewMessageBatch && userWasAtBottom) || 
                               isInitialLoad;
    
    if (shouldScrollToBottom && messagesEndRef.current) {
      isScrolling.current = true;
      
      // First immediate scroll for positioning
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'auto',
        block: 'end'
      });
      
      // Second scroll with delay for stability
      const timeoutId = setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ 
            behavior: isInitialLoad ? 'auto' : 'smooth',
            block: 'end'
          });
          
          // Reset the flag after scrolling
          if (scrollToBottomFlag.current) {
            scrollToBottomFlag.current = false;
          }
          
          // Additional stabilization delay
          setTimeout(() => {
            isScrolling.current = false;
          }, 150);
        }
      }, 50);
      
      return () => clearTimeout(timeoutId);
    } else if (!shouldScrollToBottom && !isInitialLoad) {
      // Restore previous scroll position if user wasn't at bottom
      const timeoutId = setTimeout(() => {
        if (messageContainerRef.current) {
          messageContainerRef.current.scrollTop = lastScrollTop.current;
        }
      }, 10);
      
      return () => clearTimeout(timeoutId);
    }
    
    const timeoutId = setTimeout(() => {
      isScrolling.current = false;
    }, 200);
    
    return () => clearTimeout(timeoutId);
  }, [messages, isInitialLoad, messagesEndRef, lastMessageCountRef, scrollToBottomFlag, messageContainerRef]);
};
