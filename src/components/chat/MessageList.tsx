
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Message } from "@/types/messaging";
import { MessageThread } from './MessageThread';
import { DateSeparator } from './DateSeparator';
import { shouldShowDate, organizeMessageThreads } from './utils/messageUtils';
import { LoadingSpinner } from '../ui/loading-spinner';
import { Skeleton } from '../ui/skeleton';

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onReactToMessage: (messageId: string, emoji: string) => Promise<void>;
  replyTo?: Message | null;
  setReplyTo?: (message: Message | null) => void;
  channelId: string;
}

// MessageSkeleton component for showing loading state
const MessageSkeleton = () => (
  <div className="animate-pulse space-y-3 py-2">
    <div className="flex items-center gap-2">
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-4 w-24" />
    </div>
    <Skeleton className="h-16 w-full max-w-[80%] rounded-md" />
  </div>
);

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
  const hadMessagesRef = useRef<boolean>(false); 
  const stableMessages = useRef<Message[]>([]);
  const lastStableUpdateTimestamp = useRef<number>(Date.now());
  const [showSkeletons, setShowSkeletons] = useState(true);

  // Show skeletons immediately on mount, hide after real messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      // Remove skeletons once we have real messages
      setShowSkeletons(false);
    }
  }, [messages.length]);

  // Store the latest valid messages to prevent flickering
  useEffect(() => {
    if (messages.length > 0) {
      // Only update stable messages every 2 seconds to prevent loops
      const now = Date.now();
      if (now - lastStableUpdateTimestamp.current > 2000) {
        console.log(`[MessageList] Updating stable messages with ${messages.length} messages`);
        stableMessages.current = [...messages]; // Create a new array to ensure reference changes
        lastStableUpdateTimestamp.current = now;
      }
      hadMessagesRef.current = true;
      
      // Once we have real messages, we're no longer in initial load state
      setIsInitialLoad(false);
    }
  }, [messages]);

  useEffect(() => {
    renderCountRef.current += 1;
    console.log(`[MessageList] Rendering with ${messages.length} messages (render #${renderCountRef.current})`);
  });

  const memoizedOrganizeThreads = useCallback(() => {
    // Always use stable messages when they exist and current messages are empty
    const messagesToUse = messages.length > 0 ? messages : 
      (hadMessagesRef.current && stableMessages.current.length > 0 ? stableMessages.current : messages);
    
    return organizeMessageThreads(messagesToUse);
  }, [messages]);

  const { rootMessages, messageThreads } = memoizedOrganizeThreads();

  useEffect(() => {
    if (!messageContainerRef.current) return;
    
    // Save current scroll position
    scrollPositionRef.current = messageContainerRef.current.scrollTop;
    
    const isNewMessage = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length || stableMessages.current.length;
    
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

  // Use the stable messages if current messages are empty to prevent flickering
  const displayMessages = messages.length > 0 ? messages : 
    (hadMessagesRef.current && stableMessages.current.length > 0 ? stableMessages.current : messages);

  // Show skeletons during initial load
  if (showSkeletons && isInitialLoad && displayMessages.length === 0) {
    return (
      <div className="space-y-6 p-4 md:p-5 bg-[#F8F9FA] min-h-full rounded-md flex flex-col overflow-x-hidden overscroll-x-none"
           ref={messageContainerRef}>
        {Array.from({ length: 5 }).map((_, index) => (
          <MessageSkeleton key={index} />
        ))}
        <div ref={messagesEndRef} />
      </div>
    );
  }

  // Don't show empty state if we're still in initial load or if we've ever had messages
  if (displayMessages.length === 0 && !isInitialLoad && !hadMessagesRef.current) {
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
