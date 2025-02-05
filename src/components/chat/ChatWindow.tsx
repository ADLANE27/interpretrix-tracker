import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/hooks/useChat";
import { Message } from "@/types/messaging";

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (content: string) => Promise<string>;
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-[600px] bg-gradient-to-br from-background via-background/95 to-muted/30 border rounded-xl shadow-lg backdrop-blur-sm transition-all duration-200">
      <ScrollArea 
        className="flex-1 p-4" 
        ref={scrollRef}
      >
        <div className="space-y-4">
          {messages.map((message) => {
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
            })) || [];

            return (
              <ChatMessage
                key={message.id}
                content={message.content}
                sender={sender}
                timestamp={message.timestamp}
                isCurrentUser={message.sender.id === currentUserId}
                onDelete={message.sender.id === currentUserId ? () => deleteMessage(message.id) : undefined}
                reactions={message.reactions}
                onReact={(emoji) => reactToMessage(message.id, emoji)}
                attachments={attachments}
              />
            );
          })}
        </div>
      </ScrollArea>
      <ChatInput 
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        channelId={channelId}
        currentUserId={currentUserId}
      />
    </div>
  );
};