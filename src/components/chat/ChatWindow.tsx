
import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/hooks/useChat";
import { Message } from "@/types/messaging";

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (content: string, parentMessageId?: string) => Promise<string>;
  isLoading?: boolean;
  channelId: string;
}

export const ChatWindow = ({ 
  messages, 
  onSendMessage,
  isLoading,
  channelId
}: ChatWindowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { currentUserId, deleteMessage, reactToMessage } = useChat('');
  const [replyTo, setReplyTo] = useState<{
    id: string;
    content: string;
    sender: {
      name: string;
    };
  } | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleReply = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setReplyTo({
        id: message.id,
        content: message.content,
        sender: {
          name: message.sender.name
        }
      });
    }
  };

  const messageMap = new Map(messages.map(message => [message.id, message]));

  const handleSendMessage = async (content: string, parentMessageId?: string): Promise<string> => {
    const messageId = await onSendMessage(content, parentMessageId);
    if (replyTo) {
      setReplyTo(null);
    }
    return messageId;
  };

  return (
    <div className="flex flex-col h-[600px] bg-gradient-to-br from-background via-background/95 to-muted/30 border rounded-xl shadow-lg backdrop-blur-sm transition-all duration-200">
      <ScrollArea 
        className="flex-1 p-4" 
        ref={scrollRef}
      >
        <div className="space-y-4">
          {messages.map((message) => {
            const parentMessage = message.parent_message_id 
              ? messageMap.get(message.parent_message_id) 
              : undefined;

            return (
              <ChatMessage
                key={message.id}
                content={message.content}
                sender={message.sender}
                timestamp={message.timestamp}
                isCurrentUser={message.sender.id === currentUserId}
                onDelete={message.sender.id === currentUserId ? () => deleteMessage(message.id) : undefined}
                onReply={() => handleReply(message.id)}
                isReply={!!message.parent_message_id}
                parentSender={parentMessage?.sender}
                reactions={message.reactions}
                onReact={(emoji) => reactToMessage(message.id, emoji)}
                attachments={message.attachments}
              />
            );
          })}
        </div>
      </ScrollArea>
      <ChatInput 
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        replyTo={replyTo || undefined}
        onCancelReply={() => setReplyTo(null)}
        channelId={channelId}
        currentUserId={currentUserId}
      />
    </div>
  );
};
