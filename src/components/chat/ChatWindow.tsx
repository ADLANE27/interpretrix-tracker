import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/hooks/useChat";

interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  timestamp: Date;
}

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
}

export const ChatWindow = ({ 
  messages, 
  onSendMessage,
  isLoading 
}: ChatWindowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { currentUserId, deleteMessage } = useChat('');  // We only need currentUserId and deleteMessage here

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            content={message.content}
            sender={message.sender}
            timestamp={message.timestamp}
            isCurrentUser={message.sender.id === currentUserId}
            onDelete={message.sender.id === currentUserId ? () => deleteMessage(message.id) : undefined}
          />
        ))}
      </ScrollArea>
      <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
    </div>
  );
};