
import React, { useMemo, useCallback } from 'react';
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

export const MessageList: React.FC<MessageListProps> = React.memo(({
  messages,
  currentUserId,
  onDeleteMessage,
  onReactToMessage,
  replyTo,
  setReplyTo,
  channelId,
}) => {
  // Use custom hooks for state management with improved stability
  const {
    messagesEndRef,
    messageContainerRef,
    lastMessageCountRef,
    isInitialLoad,
    hadMessagesRef,
    showSkeletons,
    scrollToBottomFlag,
    stableRenderRef,
    renderStabilityCounter
  } = useMessageListState(messages, channelId);

  // Stable scroll handler with built-in debouncing
  useMessageScroll(
    messages, 
    isInitialLoad, 
    lastMessageCountRef,
    messagesEndRef,
    scrollToBottomFlag,
    messageContainerRef
  );

  // Enhanced message organizer with improved caching
  const { organizeThreads } = useMessageOrganizer(messages);

  // Memoize organization result to prevent re-renders
  const { rootMessages, messageThreads } = useMemo(() => {
    // Return empty results during loading states
    if (showSkeletons || isInitialLoad) {
      return { rootMessages: [], messageThreads: {} };
    }
    
    // Only log organization on significant changes
    if (messages.length % 10 === 0 || messages.length <= 5) {
      console.log(`[MessageList] Organizing ${messages.length} messages for channel: ${channelId}`);
    }
    
    // Use the cached organization when possible
    return organizeThreads();
  }, [organizeThreads, showSkeletons, isInitialLoad, messages.length, channelId]);

  // Stable handler for message delete operations
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    await onDeleteMessage(messageId);
  }, [onDeleteMessage]);

  // Stable handler for reactions
  const handleReactToMessage = useCallback(async (messageId: string, emoji: string) => {
    await onReactToMessage(messageId, emoji);
  }, [onReactToMessage]);

  // Display skeletons during initial loading
  if (showSkeletons && (isInitialLoad || messages.length === 0)) {
    return (
      <div className="space-y-4 p-4 md:p-5 bg-[#F8F9FA] min-h-full rounded-md flex flex-col overflow-x-hidden overscroll-x-none"
           ref={messageContainerRef}>
        <MessageSkeleton count={5} />
        <div ref={messagesEndRef} />
      </div>
    );
  }

  // Show empty state when appropriate
  if (rootMessages.length === 0 && !isInitialLoad && !hadMessagesRef.current) {
    return (
      <div className="space-y-6 p-4 md:p-5 bg-[#F8F9FA] min-h-full rounded-md flex flex-col overflow-x-hidden overscroll-x-none items-center justify-center"
           ref={messageContainerRef}>
        <EmptyMessageState />
        <div ref={messagesEndRef} />
      </div>
    );
  }

  // Main message list with memoized components
  return (
    <div 
      className="space-y-6 p-4 md:p-5 bg-[#F8F9FA] min-h-full rounded-md flex flex-col overflow-x-hidden overscroll-x-none"
      ref={messageContainerRef}
      data-stable-render={String(renderStabilityCounter.current)}
      data-message-count={rootMessages.length}
      data-channel-id={channelId}
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
                onDeleteMessage={handleDeleteMessage}
                onReactToMessage={handleReactToMessage}
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
});

// Add display name for better debugging
MessageList.displayName = 'MessageList';
