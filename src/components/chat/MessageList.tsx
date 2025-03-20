
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
  // Utiliser des hooks personnalisés pour la gestion de l'état et le comportement de défilement
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

  // Gérer le comportement de défilement
  useMessageScroll(
    messages, 
    isInitialLoad, 
    lastMessageCountRef,
    messagesEndRef,
    scrollToBottomFlag,
    messageContainerRef
  );

  // Aide à l'organisation des messages avec une mise en cache améliorée
  const { organizeThreads, cacheVersion } = useMessageOrganizer(messages);

  // Utiliser une organisation de messages mémorisée pour éviter les recalculs inutiles
  const { rootMessages, messageThreads } = useMemo(() => {
    // Utilisation d'un console.log pour le débogage
    console.log(`[MessageList] Organizing messages for channel: ${channelId}, message count: ${messages.length}, render version: ${renderStabilityCounter}`);
    return organizeThreads();
  }, [organizeThreads, messages, cacheVersion, channelId, renderStabilityCounter]);

  // Afficher les squelettes pendant le chargement initial
  if (showSkeletons && (isInitialLoad || messages.length === 0)) {
    return (
      <div className="space-y-4 p-4 md:p-5 bg-[#F8F9FA] min-h-full rounded-md flex flex-col overflow-x-hidden overscroll-x-none"
           ref={messageContainerRef}>
        <MessageSkeleton count={10} />
        <div ref={messagesEndRef} />
      </div>
    );
  }

  // Ne pas afficher l'état vide si nous sommes toujours en chargement initial ou si nous avons déjà eu des messages
  if (rootMessages.length === 0 && !isInitialLoad && !hadMessagesRef.current) {
    return (
      <div className="space-y-6 p-4 md:p-5 bg-[#F8F9FA] min-h-full rounded-md flex flex-col overflow-x-hidden overscroll-x-none items-center justify-center"
           ref={messageContainerRef}>
        <EmptyMessageState />
        <div ref={messagesEndRef} />
      </div>
    );
  }

  // Rendre la liste de messages avec des fils de messages mémorisés
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
          // Obtenir les réponses pour ce message (s'il y en a)
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
