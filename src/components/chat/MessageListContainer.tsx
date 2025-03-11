
import React, { memo } from 'react';
import { Message } from '@/types/messaging';
import { MessageList } from './MessageList';
import { useMessageOptimization } from '@/hooks/chat/useMessageOptimization';

interface MessageListContainerProps {
  channelId: string;
  currentUserId: string | null;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onReactToMessage: (messageId: string, emoji: string) => Promise<void>;
  replyTo: Message | null;
  setReplyTo: (message: Message | null) => void;
  filters: {
    userId?: string;
    keyword?: string;
    date?: Date;
  };
}

export const MessageListContainer = memo(({
  channelId,
  currentUserId,
  onDeleteMessage,
  onReactToMessage,
  replyTo,
  setReplyTo,
  filters,
}: MessageListContainerProps) => {
  const { messages, isLoading } = useMessageOptimization(channelId, currentUserId);

  const filteredMessages = React.useMemo(() => {
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

  if (isLoading) {
    return (
      <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
        <p className="text-lg font-semibold">Chargement des messages...</p>
      </div>
    );
  }

  return (
    <MessageList
      messages={filteredMessages}
      currentUserId={currentUserId}
      onDeleteMessage={onDeleteMessage}
      onReactToMessage={onReactToMessage}
      replyTo={replyTo}
      setReplyTo={setReplyTo}
      channelId={channelId}
    />
  );
});

MessageListContainer.displayName = 'MessageListContainer';
