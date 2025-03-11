
import React, { useMemo, useEffect, useRef } from 'react';
import { Message } from "@/types/messaging";
import { MessageList } from "./MessageList";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageFilters } from './MessageFilters';

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
  filters: initialFilters
}: MessageListContainerProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = React.useState(initialFilters);

  // Reset filters when initial filters change (e.g., component remount)
  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);
  
  const filteredMessages = useMemo(() => {
    console.log('Filtering messages with:', filters);
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
        const messageDate = new Date(msg.timestamp).toLocaleDateString();
        const filterDate = filters.date!.toLocaleDateString();
        return messageDate === filterDate;
      });
    }

    return filtered;
  }, [messages, filters, currentUserId]);

  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current;
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    };

    scrollToBottom();
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [filteredMessages]);

  const handleFiltersChange = (newFilters: typeof filters) => {
    console.log('Updating filters to:', newFilters);
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    console.log('Clearing all filters');
    setFilters({ userId: undefined, keyword: undefined, date: undefined });
  };

  return (
    <div className="h-full overflow-y-auto transition-opacity duration-200">
      <MessageFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
        currentUserId={currentUserId}
      />
      <div ref={scrollAreaRef} className="px-4 pb-6">
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
    </div>
  );
});

MessageListContainer.displayName = 'MessageListContainer';

