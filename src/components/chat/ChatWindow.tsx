import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/hooks/useChat";
import { Message } from "@/types/messaging";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";

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
  const { currentUserId, deleteMessage, reactToMessage } = useChat(channelId);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>(messages);

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    setLocalMessages(prev => prev.filter(msg => msg.id !== messageId));
    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
      setLocalMessages(messages);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-gradient-to-br from-background via-background/95 to-muted/30 border rounded-xl shadow-lg backdrop-blur-sm transition-all duration-200">
      <div 
        className="flex-1 p-4 overflow-y-auto"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        <div className="space-y-4">
          {localMessages.map((message) => {
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
                onDelete={message.sender.id === currentUserId ? () => handleDeleteMessage(message.id) : undefined}
                reactions={message.reactions}
                onReact={(emoji) => reactToMessage(message.id, emoji)}
                attachments={attachments}
              />
            );
          })}
        </div>
        {showScrollButton && (
          <Button
            variant="secondary"
            size="sm"
            className="fixed bottom-24 right-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 opacity-90 hover:opacity-100"
            onClick={scrollToBottom}
          >
            <ArrowDown className="h-4 w-4 mr-2" />
            Nouveaux messages
          </Button>
        )}
      </div>
      <ChatInput 
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        channelId={channelId}
        currentUserId={currentUserId}
      />
    </div>
  );
};