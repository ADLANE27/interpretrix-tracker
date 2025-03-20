
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Message } from "@/types/messaging";
import { MessageThread } from './MessageThread';
import { DateSeparator } from './DateSeparator';
import { shouldShowDate, organizeMessageThreads } from './utils/messageUtils';
import { LoadingSpinner } from '../ui/loading-spinner';

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onReactToMessage: (messageId: string, emoji: string) => Promise<void>;
  replyTo?: Message | null;
  setReplyTo?: (message: Message | null) => void;
  channelId: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onDeleteMessage,
  onReactToMessage,
  replyTo,
  setReplyTo,
  channelId,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionRef = useRef<number>(0);
  const lastMessageCountRef = useRef<number>(0);
  const renderCountRef = useRef<number>(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // Track if we've ever had messages to prevent flickering of empty state
  const hadMessagesRef = useRef<boolean>(false); 

  useEffect(() => {
    renderCountRef.current += 1;
    console.log(`[MessageList] Rendering with ${messages.length} messages (render #${renderCountRef.current})`);
  });

  // If we have messages, remember that forever to prevent flickering
  useEffect(() => {
    if (messages.length > 0) {
      hadMessagesRef.current = true;
      setIsInitialLoad(false);
    }
  }, [messages.length]);

  const memoizedOrganizeThreads = useCallback(() => {
    return organizeMessageThreads(messages);
  }, [messages]);

  const { rootMessages, messageThreads } = memoizedOrganizeThreads();

  useEffect(() => {
    if (!messageContainerRef.current) return;
    
    // Save current scroll position
    scrollPositionRef.current = messageContainerRef.current.scrollTop;
    
    const isNewMessage = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;
    
    if (isNewMessage && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    } else {
      requestAnimationFrame(() => {
        if (messageContainerRef.current) {
          messageContainerRef.current.scrollTop = scrollPositionRef.current;
        }
      });
    }
  }, [messages]);

  // Force scroll to bottom when messages are first loaded
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current && messageContainerRef.current) {
      console.log(`[MessageList] Scrolling to bottom due to first message load`);
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages.length > 0]);

  // Don't show empty state if we're still in initial load or if we've ever had messages
  if (messages.length === 0 && !isInitialLoad && !hadMessagesRef.current) {
    return (
      <div className="space-y-6 p-4 md:p-5 bg-[#F8F9FA] min-h-full rounded-md flex flex-col overflow-x-hidden overscroll-x-none items-center justify-center"
           ref={messageContainerRef}>
        <p className="text-gray-500">Aucun message dans cette conversation</p>
        <div ref={messagesEndRef} />
      </div>
    );
  }

  return (
    <div 
      className="space-y-6 p-4 md:p-5 bg-[#F8F9FA] min-h-full rounded-md flex flex-col overflow-x-hidden overscroll-x-none"
      ref={messageContainerRef}
    >
      <div className="flex-1">
        {rootMessages.map((message, index) => {
          // Get replies for this message (if any)
          const replies = messageThreads[message.id]?.filter(m => m.id !== message.id) || [];
          
          return (
            <React.Fragment key={message.id}>
              {shouldShowDate(message, rootMessages[index - 1]) && (
                <DateSeparator date={message.timestamp} />
              )}
              
              <MessageThread 
                rootMessage={message}
                replies={replies}
                currentUserId={currentUserId}
                onDeleteMessage={onDeleteMessage}
                onReactToMessage={onReactToMessage}
                setReplyTo={setReplyTo}
                channelId={channelId}
              />
            </React.Fragment>
          );
        })}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
};
