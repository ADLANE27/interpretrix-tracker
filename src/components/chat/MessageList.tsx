import React, { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
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

// Optimized MessageSkeleton component for showing loading state
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
  const lastMessageCountRef = useRef<number>(0);
  const renderCountRef = useRef<number>(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const hadMessagesRef = useRef<boolean>(false);
  const stableMessages = useRef<Message[]>([]);
  const messageIdsRef = useRef<string[]>([]);
  const lastStableUpdateTimestamp = useRef<number>(Date.now());
  const [showSkeletons, setShowSkeletons] = useState(true);
  const initialSkeletonsShown = useRef(false);
  const lastChannelIdRef = useRef<string>('');
  const scrollToBottomFlag = useRef<boolean>(true);

  // Check if message list actually changed (by content, not just by reference)
  useEffect(() => {
    if (messages.length > 0) {
      const currentMessageIds = messages.map(m => m.id).join(',');
      const previousMessageIds = messageIdsRef.current.join(',');
      
      if (currentMessageIds !== previousMessageIds) {
        messageIdsRef.current = messages.map(m => m.id);
        
        // Only update stable messages if content actually changed
        stableMessages.current = [...messages];
        lastStableUpdateTimestamp.current = Date.now();
        hadMessagesRef.current = true;
      }
      
      // Once we have real messages, we're no longer in initial load state
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  }, [messages, isInitialLoad]);

  // Show skeletons immediately on mount, keep them until real messages arrive
  useEffect(() => {
    if (!initialSkeletonsShown.current || lastChannelIdRef.current !== channelId) {
      setShowSkeletons(true);
      initialSkeletonsShown.current = true;
      lastChannelIdRef.current = channelId;
      scrollToBottomFlag.current = true;
    }
    
    if (messages.length > 0) {
      // Remove skeletons once we have real messages with a very small delay
      const timer = setTimeout(() => {
        setShowSkeletons(false);
      }, 50); // Very short delay for smoother transition
      
      return () => clearTimeout(timer);
    }
  }, [messages.length, channelId]);

  // Force scroll to bottom with high priority using useLayoutEffect
  useLayoutEffect(() => {
    if (!messageContainerRef.current) return;
    
    const isNewMessageBatch = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;
    
    // Always scroll to bottom on first load when messages arrive
    if ((messages.length > 0 && scrollToBottomFlag.current) || isNewMessageBatch) {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: isInitialLoad ? 'auto' : 'smooth' });
        scrollToBottomFlag.current = false;
      }
    }
  }, [messages, isInitialLoad]);

  // When channel changes, reset auto-scroll flag
  useEffect(() => {
    scrollToBottomFlag.current = true;
    setIsInitialLoad(true);
    initialSkeletonsShown.current = false;
    setShowSkeletons(true);
    messageIdsRef.current = [];
    
    // Force scroll to bottom after a small delay when channel changes
    if (messageContainerRef.current) {
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
      }, 200);
    }
  }, [channelId]);

  const memoizedOrganizeThreads = useCallback(() => {
    // Always use stable messages when they exist and current messages are empty
    const messagesToUse = messages.length > 0 ? messages : 
      (hadMessagesRef.current && stableMessages.current.length > 0 ? stableMessages.current : messages);
    
    return organizeMessageThreads(messagesToUse);
  }, [messages]);

  const { rootMessages, messageThreads } = memoizedOrganizeThreads();

  // Show skeletons during initial load with more skeletons for a better experience
  if (showSkeletons && (isInitialLoad || messages.length === 0)) {
    return (
      <div className="space-y-4 p-4 md:p-5 bg-[#F8F9FA] min-h-full rounded-md flex flex-col overflow-x-hidden overscroll-x-none"
           ref={messageContainerRef}>
        {Array.from({ length: 10 }).map((_, index) => (
          <MessageSkeleton key={index} />
        ))}
        <div ref={messagesEndRef} />
      </div>
    );
  }

  // Don't show empty state if we're still in initial load or if we've ever had messages
  if (rootMessages.length === 0 && !isInitialLoad && !hadMessagesRef.current) {
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
