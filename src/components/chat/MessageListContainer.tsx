
import React, { useMemo, useEffect, useRef } from 'react';
import { Message } from "@/types/messaging";
import { MessageList } from "./MessageList";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MessageListContainerProps {
  messages: Message[];
  currentUserId: string | null;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onReactToMessage: (messageId: string, emoji: string) => Promise<void>;
  replyTo: Message | null;
  setReplyTo: (message: Message | null) => void;
  channelId: string;
  filters: {
    userId?: string;
    keyword?: string;
    date?: Date;
  };
}

export const MessageListContainer = React.memo(({
  messages,
  currentUserId,
  onDeleteMessage,
  onReactToMessage,
  replyTo,
  setReplyTo,
  channelId,
  filters
}: MessageListContainerProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const filteredMessages = useMemo(() => {
    let filtered = messages;

    if (filters.userId) {
      filtered = filtered.filter(msg => {
        if (filters.userId === 'current') {
          return msg.sender.id === currentUserId;
        }
        return msg.sender.id === filters.userId;
      });
    }

    if (filters.keyword) {
      const keywordLower = filters.keyword.toLowerCase();
      filtered = filtered.filter(msg =>
        msg.content.toLowerCase().includes(keywordLower)
      );
    }

    if (filters.date) {
      filtered = filtered.filter(msg => {
        const messageDate = new Date(msg.timestamp).toDateString();
        const filterDate = filters.date!.toDateString();
        return messageDate === filterDate;
      });
    }

    return filtered;
  }, [messages, filters, currentUserId]);

  // Scroll to bottom when new messages arrive or component mounts
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current;
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    };

    // Scroll immediately for initial load
    scrollToBottom();

    // Also scroll after a short delay to ensure all content is rendered
    const timeoutId = setTimeout(scrollToBottom, 100);

    return () => clearTimeout(timeoutId);
  }, [filteredMessages]);

  return (
    <div ref={scrollAreaRef} className="h-full overflow-y-auto px-4">
      <MessageList
        messages={filteredMessages}
        currentUserId={currentUserId}
        onDeleteMessage={onDeleteMessage}
        onReactToMessage={onReactToMessage}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
        channelId={channelId}
      />
    </div>
  );
});

MessageListContainer.displayName = 'MessageListContainer';
