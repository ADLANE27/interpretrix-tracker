
import React from 'react';
import { Message } from "@/types/messaging";
import { ChatMessageList } from "./core/ChatMessageList";

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  onReactToMessage?: (messageId: string, emoji: string) => Promise<void>;
  replyTo?: Message | null;
  setReplyTo?: (message: Message | null) => void;
  channelId?: string;
}

export const UnifiedMessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onDeleteMessage,
  onReactToMessage,
  replyTo,
  setReplyTo,
  channelId = "",
}) => {
  const handleReplyToMessage = (message: Message) => {
    if (setReplyTo) {
      setReplyTo(message);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (onDeleteMessage) {
      await onDeleteMessage(messageId);
    }
  };

  return (
    <ChatMessageList
      messages={messages}
      currentUserId={currentUserId}
      channelId={channelId}
      onDeleteMessage={handleDeleteMessage}
      onReplyToMessage={handleReplyToMessage}
      dark={true}
    />
  );
};
