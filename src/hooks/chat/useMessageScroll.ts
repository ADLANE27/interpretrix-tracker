
import { useEffect, useRef, useCallback } from 'react';
import { Message } from '@/types/messaging';
import { CONNECTION_CONSTANTS } from '../supabase-connection/constants';

export const useMessageScroll = (
  messages: Message[],
  isLoading: boolean,
  channelId: string
) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const prevMessagesLengthRef = useRef<number>(0);
  const prevChannelIdRef = useRef<string | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);

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
      }
    }, 100);
  }, []);

  // Scroll to bottom when channel changes or when new messages are added
  useEffect(() => {
    const isChannelChange = channelId !== prevChannelIdRef.current;
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    
    prevChannelIdRef.current = channelId;
    prevMessagesLengthRef.current = messages.length;

    if (isLoading) {
      return; // Don't scroll while loading
    }

    if (isChannelChange && messages.length > 0) {
      console.log('[MessageScroll] Channel changed, scrolling to bottom');
      scrollToBottom();
    } else if (isNewMessage && messages.length > 0) {
      console.log('[MessageScroll] New messages, scrolling to bottom');
      // Use smooth scrolling for new messages in the same channel for better UX
      scrollToBottom('smooth');
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
    scrollToBottom
  };
};
