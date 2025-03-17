
import { useEffect, useRef, useCallback, useState } from 'react';
import { Message } from '@/types/messaging';

export const useMessageScroll = (
  messages: Message[],
  isLoading: boolean,
  channelId: string,
  pendingMessages?: any[] // Accept pending messages for better UX
) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const prevMessagesLengthRef = useRef<number>(0);
  const prevChannelIdRef = useRef<string | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [shouldShowScrollButton, setShouldShowScrollButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastUserScrollTime = useRef<number>(0);
  const isScrolledToBottomRef = useRef<boolean>(true);

  // Check if scrolled to bottom
  const isScrolledToBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // Consider "almost" scrolled to bottom with a small threshold
    const threshold = 100;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, []);

  // Handle user scroll actions
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    // Update isScrolledToBottom ref
    isScrolledToBottomRef.current = isScrolledToBottom();
    
    // Check if user is scrolling (not programmatic)
    const now = Date.now();
    if (now - lastUserScrollTime.current > 50) {
      setIsUserScrolling(true);
      lastUserScrollTime.current = now;
      
      // Show scroll button if needed
      if (!isScrolledToBottomRef.current) {
        setShouldShowScrollButton(true);
      } else {
        setShouldShowScrollButton(false);
        setUnreadCount(0);
      }
      
      // Clear any auto-scroll timeout when user scrolls
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    }
    
    // After a delay, consider the user has stopped scrolling
    window.setTimeout(() => {
      if (now === lastUserScrollTime.current) {
        setIsUserScrolling(false);
      }
    }, 150);
  }, [isScrolledToBottom]);

  // Register scroll handler
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

  // Scroll to bottom with customizable behavior
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }

    // Small delay to ensure DOM has updated
    scrollTimeoutRef.current = window.setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
        console.log('[MessageScroll] Scrolled to bottom');
        setShouldShowScrollButton(false);
        setUnreadCount(0);
        // Set the bottom ref after scrolling
        isScrolledToBottomRef.current = true;
      }
    }, 100);
  }, []);

  // Track new messages while user is scrolled up
  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    const isChannelChange = channelId !== prevChannelIdRef.current;
    
    if (!isLoading && isNewMessage && !isChannelChange) {
      if (!isScrolledToBottomRef.current && !isUserScrolling) {
        // User is scrolled up, increment unread count
        setUnreadCount(prev => prev + (messages.length - prevMessagesLengthRef.current));
      }
    }
    
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, isLoading, channelId, isUserScrolling]);

  // Scroll to bottom when channel changes or when initially loading messages
  useEffect(() => {
    const isChannelChange = channelId !== prevChannelIdRef.current;
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    
    prevChannelIdRef.current = channelId;
    
    if (isLoading) {
      return; // Don't scroll while loading
    }

    if (isChannelChange && messages.length > 0) {
      console.log('[MessageScroll] Channel changed, scrolling to bottom');
      scrollToBottom();
      setUnreadCount(0);
    } else if (isNewMessage && messages.length > 0) {
      console.log('[MessageScroll] New messages:', messages.length - prevMessagesLengthRef.current);
      
      // Auto-scroll only if the user was already at the bottom or close to it
      if (isScrolledToBottomRef.current) {
        console.log('[MessageScroll] User at bottom, auto-scrolling');
        // Use smooth scrolling for better UX when new messages arrive
        scrollToBottom('smooth');
      } else {
        console.log('[MessageScroll] User scrolled up, not auto-scrolling');
      }
    }
  }, [messages.length, isLoading, channelId, scrollToBottom]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    messagesEndRef,
    messagesContainerRef,
    scrollToBottom,
    shouldShowScrollButton,
    unreadCount,
    isUserScrolling
  };
};
