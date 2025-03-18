
import React, { useRef, useEffect } from 'react';
import { ChatThread } from './ChatThread';
import { MessageDateDivider } from './MessageDateDivider';
import { Message } from '@/types/messaging';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMessageVisibility } from '@/hooks/useMessageVisibility';

interface ChatMessageListProps {
  messages: Message[];
  currentUserId: string | null;
  channelId: string;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onReplyToMessage: (message: Message) => void;
  dark?: boolean;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  currentUserId,
  channelId,
  onDeleteMessage,
  onReplyToMessage,
  dark = false,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { observeMessage } = useMessageVisibility(channelId);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages.length]);

  // Group messages by thread
  const messageThreads = messages.reduce((acc: { [key: string]: Message[] }, message) => {
    const threadId = message.parent_message_id || message.id;
    if (!acc[threadId]) {
      acc[threadId] = [];
    }
    acc[threadId].push(message);
    return acc;
  }, {});

  // Get root messages (messages that start a thread)
  const rootMessages = messages.filter(message => !message.parent_message_id);
  
  // Sort root messages by creation date
  rootMessages.sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  // Check if we need to show a date divider
  const shouldShowDate = (currentMessage: Message, previousMessage?: Message) => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.timestamp);
    const previousDate = new Date(previousMessage.timestamp);
    
    return (
      currentDate.getDate() !== previousDate.getDate() ||
      currentDate.getMonth() !== previousDate.getMonth() ||
      currentDate.getFullYear() !== previousDate.getFullYear()
    );
  };

  return (
    <ScrollArea className="h-full pr-2">
      <div className="p-4 space-y-4" key={`messages-${messages.length}`}>
        {rootMessages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            Aucun message dans cette conversation
          </div>
        ) : (
          <>
            {rootMessages.map((message, index) => (
              <React.Fragment key={message.id}>
                {shouldShowDate(message, rootMessages[index - 1]) && (
                  <MessageDateDivider date={new Date(message.timestamp)} />
                )}
                
                <div ref={(el) => observeMessage(el)}>
                  <ChatThread
                    rootMessage={message}
                    replies={messageThreads[message.id]?.filter(m => m.id !== message.id) || []}
                    currentUserId={currentUserId}
                    onDeleteMessage={onDeleteMessage}
                    onReplyToMessage={onReplyToMessage}
                    dark={dark}
                  />
                </div>
              </React.Fragment>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};
