import { ChatInput } from "../ChatInput";
import { MessageComposerProps } from "@/types/messaging";

export const MessageComposer = ({
  onSendMessage,
  isLoading,
  replyTo,
  onCancelReply,
  channelId // Add channelId prop
}: MessageComposerProps) => {
  return (
    <ChatInput
      onSendMessage={onSendMessage}
      isLoading={isLoading}
      replyTo={replyTo}
      onCancelReply={onCancelReply}
      channelId={channelId} // Pass channelId to ChatInput
    />
  );
};