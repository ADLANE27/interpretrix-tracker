
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
  // Force scroll to bottom with high priority using useLayoutEffect
  useLayoutEffect(() => {
    if (!messageContainerRef.current) return;
    
    const isNewMessageBatch = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;
    
    // Always scroll to bottom on first load when messages arrive
    if ((messages.length > 0 && scrollToBottomFlag.current) || isNewMessageBatch) {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: isInitialLoad ? 'auto' : 'smooth' });
        scrollToBottomFlag.current = false;
      }
    }
  }, [messages, isInitialLoad, messagesEndRef, lastMessageCountRef, scrollToBottomFlag, messageContainerRef]);
};
