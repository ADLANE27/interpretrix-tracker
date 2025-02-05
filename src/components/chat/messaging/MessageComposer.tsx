import { ChatInput } from "../ChatInput";
import { MessageComposerProps } from "@/types/messaging";

export const MessageComposer = ({
  onSendMessage,
  isLoading,
  replyTo,
  onCancelReply,
  channelId,
  currentUserId // Add currentUserId to destructuring
}: MessageComposerProps) => {
  return (
    <ChatInput
      onSendMessage={onSendMessage}
      isLoading={isLoading}
      replyTo={replyTo}
      onCancelReply={onCancelReply}
      channelId={channelId}
      currentUserId={currentUserId} // Pass currentUserId to ChatInput
    />
  );
};