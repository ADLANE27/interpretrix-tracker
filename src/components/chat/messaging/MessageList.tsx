import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "../ChatMessage";
import { Message } from "@/types/chat";

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  onDeleteMessage?: (messageId: string) => void;
  onReplyMessage?: (messageId: string) => void;
  onReactToMessage?: (messageId: string, emoji: string) => void;
}

export const MessageList = ({
  messages,
  currentUserId,
  onDeleteMessage,
  onReplyMessage,
  onReactToMessage
}: MessageListProps) => {
  return (
    <ScrollArea className="flex-1 p-4">
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
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
    </ScrollArea>
  );
};