
import { useRef, useEffect, UIEvent } from 'react';
import { Message } from '@/types/messaging';

interface UseChatScrollProps {
  messages: Message[];
  isLoading: boolean;
  hasMoreMessages: boolean;
  loadMoreMessages: () => void;
}

export const useChatScroll = ({
  messages,
  isLoading,
  hasMoreMessages,
  loadMoreMessages
}: UseChatScrollProps) => {
  const messageContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive, but only if already at bottom
  useEffect(() => {
    if (messageContainerRef.current) {
      const container = messageContainerRef.current;
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      
      if (isAtBottom) {
        setTimeout(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  }, [messages]);

  // Function to handle scroll to load more messages
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    // Load more messages when user scrolls near the top
    if (target.scrollTop < 50 && !isLoading && hasMoreMessages) {
      loadMoreMessages();
    }
  };

  return {
    messageContainerRef,
    handleScroll
  };
};
