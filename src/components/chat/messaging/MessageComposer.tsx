import { ChatInput } from "../ChatInput";
import { MessageComposerProps } from "@/types/messaging";

export const MessageComposer = ({
  onSendMessage,
  isLoading,
  replyTo,
  onCancelReply,
  channelId,
  currentUserId
}: MessageComposerProps) => {
  const handleSendMessage = async (content: string, parentMessageId?: string): Promise<string> => {
    const messageId = await onSendMessage(content, parentMessageId);
    if (!messageId) throw new Error("Failed to send message");
    return messageId;
  };

  return (
    <ChatInput
      onSendMessage={handleSendMessage}
      isLoading={isLoading}
      replyTo={replyTo}
      onCancelReply={onCancelReply}
      channelId={channelId}
      currentUserId={currentUserId}
    />
  );
};