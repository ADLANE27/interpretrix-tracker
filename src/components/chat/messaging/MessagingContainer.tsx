import { useState } from "react";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { useChat } from "@/hooks/useChat";
import { Message } from "@/types/chat";

interface MessagingContainerProps {
  channelId: string;
}

export const MessagingContainer = ({ channelId }: MessagingContainerProps) => {
  const { messages, sendMessage, deleteMessage, currentUserId, reactToMessage, isLoading } = useChat(channelId);
  const [replyTo, setReplyTo] = useState<{
    id: string;
    content: string;
    sender: {
      name: string;
    };
  } | null>(null);

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

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg">
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        onDeleteMessage={deleteMessage}
        onReplyMessage={handleReply}
        onReactToMessage={reactToMessage}
      />
      <MessageComposer
        onSendMessage={sendMessage}
        isLoading={isLoading}
        replyTo={replyTo || undefined}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
};