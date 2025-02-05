import { useState, useRef, useEffect } from "react";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { useChat } from "@/hooks/useChat";
import { Message, ReplyToMessage } from "@/types/messaging";
import { Loader2 } from "lucide-react";

interface MessagingContainerProps {
  channelId: string;
}

export const MessagingContainer = ({ channelId }: MessagingContainerProps) => {
  const { 
    messages, 
    sendMessage, 
    deleteMessage, 
    currentUserId, 
    reactToMessage, 
    isLoading,
    isSubscribed 
  } = useChat(channelId);
  
  const [replyTo, setReplyTo] = useState<ReplyToMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
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

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-background to-muted/30 border rounded-lg shadow-lg items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Chargement des messages...</span>
        </div>
      </div>
    );
  }

  if (!isSubscribed) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-background to-muted/30 border rounded-lg shadow-lg items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Connexion au chat en cours...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background to-muted/30 border rounded-lg shadow-lg">
      <div className="flex-1 overflow-hidden min-h-0 relative">
        <div className="absolute inset-0 overflow-y-auto">
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            onDeleteMessage={deleteMessage}
            onReplyMessage={handleReply}
            onReactToMessage={reactToMessage}
          />
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="mt-auto border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <MessageComposer
          onSendMessage={sendMessage}
          isLoading={isLoading}
          replyTo={replyTo || undefined}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>
    </div>
  );
};