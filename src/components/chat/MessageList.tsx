
import React, { useCallback } from 'react';
import { Message } from "@/types/messaging";
import { MessageThread } from './MessageThread';
import { DateSeparator } from './DateSeparator';
import { shouldShowDate } from './utils/messageUtils';
import { MessageSkeleton } from './MessageSkeleton';
import { EmptyMessageState } from './EmptyMessageState';
import { useMessageListState } from '@/hooks/chat/useMessageListState';
import { useMessageScroll } from '@/hooks/chat/useMessageScroll';
import { useMessageOrganizer } from './utils/messageOrganizer';

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
  // Use custom hooks for state management and scroll behavior
  const {
    messagesEndRef,
    messageContainerRef,
    lastMessageCountRef,
    isInitialLoad,
    hadMessagesRef,
    stableMessages,
    showSkeletons,
    scrollToBottomFlag
  } = useMessageListState(messages, channelId);

  // Handle scroll behavior
  useMessageScroll(
    messages, 
    isInitialLoad, 
    lastMessageCountRef,
    messagesEndRef,
    scrollToBottomFlag,
    messageContainerRef
  );

  // Message organization helper
  const { organizeThreads } = useMessageOrganizer(messages);

  // Call organize threads with current state
  const memoizedOrganizeThreads = useCallback(() => {
    return organizeThreads(messages, stableMessages, hadMessagesRef);
  }, [messages, stableMessages, hadMessagesRef, organizeThreads]);

  const { rootMessages, messageThreads } = memoizedOrganizeThreads();

  // Show skeletons during initial load
  if (showSkeletons && (isInitialLoad || messages.length === 0)) {
    return (
      <div className="space-y-4 p-4 md:p-5 bg-[#F8F9FA] min-h-full rounded-md flex flex-col overflow-x-hidden overscroll-x-none"
           ref={messageContainerRef}>
        <MessageSkeleton count={10} />
        <div ref={messagesEndRef} />
      </div>
    );
  }

  // Don't show empty state if we're still in initial load or if we've ever had messages
  if (rootMessages.length === 0 && !isInitialLoad && !hadMessagesRef.current) {
    return (
      <div className="space-y-6 p-4 md:p-5 bg-[#F8F9FA] min-h-full rounded-md flex flex-col overflow-x-hidden overscroll-x-none items-center justify-center"
           ref={messageContainerRef}>
        <EmptyMessageState />
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
