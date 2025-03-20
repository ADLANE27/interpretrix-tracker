
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
  const scrollStabilityCounter = useRef(0);
  const scrollLock = useRef(false);
  const lastMessagesLength = useRef(0);
  const scrollOperationInProgress = useRef(false);
  
  // Use useLayoutEffect for more predictable scroll behavior
  useLayoutEffect(() => {
    // Avoid scroll operations if container isn't available
    if (!messageContainerRef.current || messages.length === 0 || scrollLock.current) return;
    
    // Skip if messages haven't changed
    if (messages.length === lastMessagesLength.current && initialScrollDone.current) {
      return;
    }
    
    // Update tracked message count
    lastMessagesLength.current = messages.length;
    
    // Set scroll lock to prevent concurrent operations
    scrollLock.current = true;
    scrollOperationInProgress.current = true;
    
    const isNewMessageBatch = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;
    
    // Store current scroll position
    if (messageContainerRef.current) {
      lastScrollTop.current = messageContainerRef.current.scrollTop;
    }
    
    // Clear any pending scroll operations
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    
    // Determine if we should scroll to bottom
    const container = messageContainerRef.current;
    const userWasAtBottom = container && 
      (container.scrollHeight - container.scrollTop - container.clientHeight < 150);
    
    const shouldScrollToBottom = scrollToBottomFlag.current || 
                               (isNewMessageBatch && userWasAtBottom) || 
                               isInitialLoad || 
                               !initialScrollDone.current;
    
    if (shouldScrollToBottom && messagesEndRef.current) {
      isScrolling.current = true;
      
      // First immediate scroll for positioning
      requestAnimationFrame(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ 
            behavior: 'auto',
            block: 'end'
          });
        }
      });
      
      // Set initial scroll flag
      initialScrollDone.current = true;
      
      // Second scroll with delay for stability
      scrollTimeoutRef.current = setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ 
            behavior: isInitialLoad ? 'auto' : 'smooth',
            block: 'end'
          });
          
          // Reset scroll to bottom flag
          if (scrollToBottomFlag.current) {
            scrollToBottomFlag.current = false;
          }
          
          // Additional stabilization delay
          scrollTimeoutRef.current = setTimeout(() => {
            isScrolling.current = false;
            scrollStabilityCounter.current += 1;
            scrollLock.current = false;
            scrollOperationInProgress.current = false;
          }, 200);
        }
      }, 100);
      
    } else if (!shouldScrollToBottom && !isInitialLoad) {
      // Restore previous scroll position
      scrollTimeoutRef.current = setTimeout(() => {
        if (messageContainerRef.current) {
          messageContainerRef.current.scrollTop = lastScrollTop.current;
          
          // Release locks after a short delay
          scrollTimeoutRef.current = setTimeout(() => {
            isScrolling.current = false;
            scrollStabilityCounter.current += 1;
            scrollLock.current = false;
            scrollOperationInProgress.current = false;
          }, 100);
        }
      }, 50);
    } else {
      // Release locks if no scroll actions needed
      scrollTimeoutRef.current = setTimeout(() => {
        isScrolling.current = false;
        scrollStabilityCounter.current += 1;
        scrollLock.current = false;
        scrollOperationInProgress.current = false;
      }, 150);
    }
    
    // Clean up timeouts on unmount
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
        scrollLock.current = false;
        scrollOperationInProgress.current = false;
      }
    };
  }, [messages, isInitialLoad, messagesEndRef, lastMessageCountRef, scrollToBottomFlag, messageContainerRef]);
};
