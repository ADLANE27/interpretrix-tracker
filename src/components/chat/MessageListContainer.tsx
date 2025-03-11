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
  const lastMessageRef = useRef<string | null>(null);

  useEffect(() => {
    console.log('Filter update effect triggered:', initialFilters);
    setFilters(initialFilters);
  }, [initialFilters]);
  
  const filteredMessages = useMemo(() => {
    console.log('Filtering messages:', messages.length, 'with filters:', filters);
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
        const messageDate = new Date(msg.timestamp);
        const filterDate = new Date(filters.date!);
        return (
          messageDate.getFullYear() === filterDate.getFullYear() &&
          messageDate.getMonth() === filterDate.getMonth() &&
          messageDate.getDate() === filterDate.getDate()
        );
      });
    }

    console.log('Filtered messages:', filtered.length);
    return filtered;
  }, [messages, filters, currentUserId]);

  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current;
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    };

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.id !== lastMessageRef.current) {
      scrollToBottom();
      lastMessageRef.current = lastMessage?.id || null;
    }
  }, [messages]);

  const handleFiltersChange = (newFilters: typeof filters) => {
    console.log('Updating filters to:', newFilters);
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    console.log('Clearing all filters');
    setFilters({ userId: undefined, keyword: undefined, date: undefined });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 bg-background/95 backdrop-blur-md border-b z-10 sticky top-0">
        <MessageFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
          currentUserId={currentUserId}
          channelId={channelId}
        />
      </div>
      <ScrollArea className="flex-1">
        <div className="min-h-full p-4">
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
      </ScrollArea>
    </div>
  );
});

MessageListContainer.displayName = 'MessageListContainer';
