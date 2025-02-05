import { useEffect, useRef, useState } from "react";
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
  reactions?: Record<string, string[]>;
}

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (content: string, parentMessageId?: string) => void;
  isLoading?: boolean;
  channelId: string; // Add channelId prop
}

export const ChatWindow = ({ 
  messages, 
  onSendMessage,
  isLoading,
  channelId // Destructure channelId
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

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background/95 to-muted/30 border rounded-xl shadow-lg backdrop-blur-sm transition-all duration-200">
      <ScrollArea 
        className="flex-1 p-4 space-y-4 overflow-hidden" 
        ref={scrollRef}
      >
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
            />
          );
        })}
      </ScrollArea>
      <ChatInput 
        onSendMessage={onSendMessage} 
        isLoading={isLoading}
        replyTo={replyTo || undefined}
        onCancelReply={() => setReplyTo(null)}
        channelId={channelId} // Pass channelId to ChatInput
      />
    </div>
  );
};