
import React from 'react';
import { ChatMessageList } from '@/components/chat/core/ChatMessageList';
import { Message } from '@/types/messaging';

interface MessageListProps {
  messages: Message[];
  expandedThreads: Set<string>;
  currentUserId: any;
  onToggleThread: (messageId: string) => void;
  onDeleteMessage: (messageId: string, senderId: string) => void;
  onReplyToMessage: (message: Message) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onDeleteMessage,
  onReplyToMessage,
}) => {
  // Adapt to the new ChatMessageList interface
  const handleDeleteMessage = async (messageId: string) => {
    if (!currentUserId) return;
    await onDeleteMessage(messageId, currentUserId);
  };

  return (
    <ChatMessageList
      messages={messages}
      currentUserId={currentUserId?.id || currentUserId}
      channelId={messages[0]?.channel_id || ""}
      onDeleteMessage={handleDeleteMessage}
      onReplyToMessage={onReplyToMessage}
    />
  );
};
