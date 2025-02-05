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
    return await onSendMessage(content, parentMessageId);
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