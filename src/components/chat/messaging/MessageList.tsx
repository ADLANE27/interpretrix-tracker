
import { ChatMessage } from "../ChatMessage";
import { MessageListProps } from "@/types/messaging";

export const MessageList = ({
  messages,
  currentUserId,
  onDeleteMessage,
  onReplyMessage,
  onReactToMessage
}: MessageListProps) => {
  return (
    <div className="flex flex-col gap-4 p-4">
      {messages.map((message) => {
        // Ensure all required properties are present
        const sender = {
          id: message.sender.id,
          name: message.sender.name,
          avatarUrl: message.sender.avatarUrl
        };

        const attachments = message.attachments?.map(att => ({
          url: att.url,
          filename: att.filename,
          type: att.type,
          size: att.size
        }));

        return (
          <ChatMessage
            key={message.id}
            content={message.content}
            sender={sender}
            timestamp={message.timestamp}
            isCurrentUser={message.sender.id === currentUserId}
            onDelete={message.sender.id === currentUserId ? () => onDeleteMessage?.(message.id) : undefined}
            onReply={() => onReplyMessage?.(message.id)}
            isReply={!!message.parent_message_id}
            reactions={message.reactions}
            onReact={(emoji) => onReactToMessage?.(message.id, emoji)}
            attachments={attachments}
          />
        );
      })}
    </div>
  );
};
