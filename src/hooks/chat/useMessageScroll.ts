
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
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialScrollDone = useRef(false);
  
  // Use useLayoutEffect to ensure scrolling happens before visual render
  useLayoutEffect(() => {
    if (!messageContainerRef.current || messages.length === 0 || isScrolling.current) return;
    
    const isNewMessageBatch = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;
    
    // Store current scroll position
    if (messageContainerRef.current) {
      lastScrollTop.current = messageContainerRef.current.scrollTop;
    }
    
    // Clear any previous scroll timeouts
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    
    // Determine if we should scroll to bottom
    const container = messageContainerRef.current;
    const userWasAtBottom = container && 
      (container.scrollHeight - container.scrollTop - container.clientHeight < 100);
    
    const shouldScrollToBottom = scrollToBottomFlag.current || 
                               (isNewMessageBatch && userWasAtBottom) || 
                               isInitialLoad || 
                               !initialScrollDone.current;
    
    if (shouldScrollToBottom && messagesEndRef.current) {
      isScrolling.current = true;
      
      // First immediate scroll for positioning
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'auto',
        block: 'end'
      });
      
      // Set initial scroll done flag
      initialScrollDone.current = true;
      
      // Second scroll with delay for stability
      scrollTimeoutRef.current = setTimeout(() => {
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
          scrollTimeoutRef.current = setTimeout(() => {
            isScrolling.current = false;
            scrollTimeoutRef.current = null;
          }, 250);
        }
      }, 100);
      
    } else if (!shouldScrollToBottom && !isInitialLoad) {
      // Restore previous scroll position if user wasn't at bottom
      scrollTimeoutRef.current = setTimeout(() => {
        if (messageContainerRef.current) {
          messageContainerRef.current.scrollTop = lastScrollTop.current;
          
          scrollTimeoutRef.current = setTimeout(() => {
            isScrolling.current = false;
            scrollTimeoutRef.current = null;
          }, 100);
        }
      }, 50);
    } else {
      // Release the scroll lock after a short delay
      scrollTimeoutRef.current = setTimeout(() => {
        isScrolling.current = false;
        scrollTimeoutRef.current = null;
      }, 200);
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, [messages, isInitialLoad, messagesEndRef, lastMessageCountRef, scrollToBottomFlag, messageContainerRef]);
};
