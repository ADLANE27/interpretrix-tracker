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
  parent_message_id?: string;
}

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (content: string, parentMessageId?: string) => void;
  isLoading?: boolean;
}

export const ChatWindow = ({ 
  messages, 
  onSendMessage,
  isLoading 
}: ChatWindowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { currentUserId, deleteMessage } = useChat('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleReply = (messageId: string) => {
    // For now, we'll just log the reply action
    console.log('Replying to message:', messageId);
  };

  // Create a map of parent messages for quick lookup
  const messageMap = new Map(messages.map(message => [message.id, message]));

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
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
            />
          );
        })}
      </ScrollArea>
      <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
    </div>
  );
};