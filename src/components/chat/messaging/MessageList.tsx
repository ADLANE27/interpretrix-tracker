import { ChatMessage } from "../ChatMessage";
import { MessageListProps } from "@/types/messaging";

export const MessageList = ({
  messages,
  currentUserId,
  onDeleteMessage,
  onReplyMessage,
  onReactToMessage,
  channelId
}: MessageListProps) => {
  return (
    <div className="flex flex-col gap-4 p-4">
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          messageId={message.id}
          channelId={channelId}
          content={message.content}
          sender={message.sender}
          timestamp={message.timestamp}
          isCurrentUser={message.sender.id === currentUserId}
          onDelete={message.sender.id === currentUserId ? () => onDeleteMessage?.(message.id) : undefined}
          onReply={() => onReplyMessage?.(message.id)}
          isReply={!!message.parent_message_id}
          reactions={message.reactions}
          onReact={(emoji) => onReactToMessage?.(message.id, emoji)}
          attachments={message.attachments}
        />
      ))}
    </div>
  );
};