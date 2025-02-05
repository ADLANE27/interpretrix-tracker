import { useState, useRef } from "react";
import { ChatInput } from "../ChatInput";

interface MessageComposerProps {
  onSendMessage: (content: string, parentMessageId?: string, attachments?: any[]) => void;
  isLoading?: boolean;
  replyTo?: {
    id: string;
    content: string;
    sender: {
      name: string;
    };
  };
  onCancelReply?: () => void;
}

export const MessageComposer = ({
  onSendMessage,
  isLoading,
  replyTo,
  onCancelReply
}: MessageComposerProps) => {
  return (
    <ChatInput
      onSendMessage={onSendMessage}
      isLoading={isLoading}
      replyTo={replyTo}
      onCancelReply={onCancelReply}
    />
  );
};