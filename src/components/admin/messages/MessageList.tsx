
import React from 'react';
import { MessageThread } from './MessageThread';
import { MessageDateDivider } from './MessageDateDivider';

interface MessageSender {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  channel_id: string;
  sender_id: string;
  parent_message_id?: string | null;
  sender?: MessageSender;
}

interface MessageListProps {
  messages: Message[];
  expandedThreads: Set<string>;
  currentUserId: any;
  onToggleThread: (messageId: string) => void;
  onDeleteMessage: (messageId: string, senderId: string) => void;
  onReplyToMessage: (message: Message) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  expandedThreads,
  currentUserId,
  onToggleThread,
  onDeleteMessage,
  onReplyToMessage,
}) => {
  const shouldShowDate = (currentMessage: Message, previousMessage?: Message) => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.created_at);
    const previousDate = new Date(previousMessage.created_at);
    
    return (
      currentDate.getDate() !== previousDate.getDate() ||
      currentDate.getMonth() !== previousDate.getMonth() ||
      currentDate.getFullYear() !== previousDate.getFullYear()
    );
  };

  // Group messages by parent_message_id or by their own id if they're root messages
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
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return (
    <div className="space-y-6" key={messages.length}>
      {rootMessages.map((message, index) => (
        <React.Fragment key={message.id}>
          {shouldShowDate(message, rootMessages[index - 1]) && (
            <MessageDateDivider date={new Date(message.created_at)} />
          )}
          
          <MessageThread
            rootMessage={message}
            replies={messageThreads[message.id]?.filter(m => m.id !== message.id) || []}
            isThreadExpanded={expandedThreads.has(message.id)}
            currentUserId={currentUserId}
            onToggleThread={onToggleThread}
            onDeleteMessage={onDeleteMessage}
            onReplyToMessage={onReplyToMessage}
          />
        </React.Fragment>
      ))}
    </div>
  );
};
