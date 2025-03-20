
import React, { useMemo } from 'react';
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
    showSkeletons,
    scrollToBottomFlag,
    stableRenderRef,
    renderStabilityCounter
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

  // Use the enhanced message organizer with improved caching
  const { organizeThreads, cacheVersion } = useMessageOrganizer(messages);

  // Use a stable and memoized organization of messages
  const { rootMessages, messageThreads } = useMemo(() => {
    if (showSkeletons || isInitialLoad) {
      return { rootMessages: [], messageThreads: {} };
    }
    
    // Only log on significant changes to reduce console noise
    if (messages.length % 5 === 0 || messages.length <= 5) {
      console.log(`[MessageList] Organizing ${messages.length} messages for channel: ${channelId} (v${cacheVersion})`);
    }
    
    return organizeThreads();
  }, [organizeThreads, messages.length, cacheVersion, channelId, showSkeletons, isInitialLoad]);

  // Display skeletons during initial loading
  if (showSkeletons && (isInitialLoad || messages.length === 0)) {
    return (
      <div className="space-y-4 p-4 md:p-5 bg-[#F8F9FA] min-h-full rounded-md flex flex-col overflow-x-hidden overscroll-x-none"
           ref={messageContainerRef}>
        <MessageSkeleton count={10} />
        <div ref={messagesEndRef} />
      </div>
    );
  }

  // Don't show empty state if we're still in initial loading or if we've already had messages
  if (rootMessages.length === 0 && !isInitialLoad && !hadMessagesRef.current) {
    return (
      <div className="space-y-6 p-4 md:p-5 bg-[#F8F9FA] min-h-full rounded-md flex flex-col overflow-x-hidden overscroll-x-none items-center justify-center"
           ref={messageContainerRef}>
        <EmptyMessageState />
        <div ref={messagesEndRef} />
      </div>
    );
  }

  // Render the message list with memoized message threads
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
