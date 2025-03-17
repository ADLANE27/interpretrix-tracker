
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Message } from "@/types/messaging";
import { MessageAttachment } from './MessageAttachment';
import { Trash2, MessageCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { useMessageVisibility } from '@/hooks/useMessageVisibility';
import { Skeleton } from '@/components/ui/skeleton';
import { useProgressiveImage } from '@/hooks/useProgressiveImage';

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onReactToMessage: (messageId: string, emoji: string) => Promise<void>;
  replyTo?: Message | null;
  setReplyTo?: (message: Message | null) => void;
  channelId: string;
  messagesEndRef?: React.RefObject<HTMLDivElement>;
  isLoading?: boolean;
  loadMoreMessages?: () => void;
  hasMore?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onDeleteMessage,
  onReactToMessage,
  replyTo,
  setReplyTo,
  channelId,
  messagesEndRef,
  isLoading = false,
  loadMoreMessages,
  hasMore = false
}) => {
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const { observeMessage } = useMessageVisibility(channelId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [lastScrollPosition, setLastScrollPosition] = useState(0);
  const [isScrollingUp, setIsScrollingUp] = useState(false);
  const loadTriggerRef = useRef<HTMLDivElement>(null);

  // Memoize messages to prevent unnecessary re-renders
  const memoizedMessages = useMemo(() => messages, [messages]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMessageDate = (date: Date) => {
    if (isToday(date)) {
      return "Aujourd'hui";
    } else if (isYesterday(date)) {
      return "Hier";
    }
    return format(date, 'EEEE d MMMM yyyy', { locale: fr });
  };

  // Memoize date checks to prevent flickering
  const messageDateGroups = useMemo(() => {
    const groups: {[key: string]: Message[]} = {};
    
    memoizedMessages.forEach((message, index) => {
      const currentDate = new Date(message.timestamp);
      const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      
      groups[dateKey].push(message);
    });
    
    return groups;
  }, [memoizedMessages]);

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

  const toggleThread = (messageId: string) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  // Intersection observer for loading more messages when scrolling up
  useEffect(() => {
    if (!loadMoreMessages || !hasMore || !loadTriggerRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMoreMessages();
        }
      },
      { threshold: 0.5 }
    );
    
    observer.observe(loadTriggerRef.current);
    
    return () => {
      if (loadTriggerRef.current) {
        observer.unobserve(loadTriggerRef.current);
      }
    };
  }, [loadMoreMessages, hasMore, isLoading]);

  // Handle scrolling detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const currentPosition = container.scrollTop;
      setIsScrollingUp(currentPosition < lastScrollPosition);
      setLastScrollPosition(currentPosition);
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [lastScrollPosition]);

  // Group messages by parent_message_id
  const messageThreads = useMemo(() => {
    return memoizedMessages.reduce((acc: { [key: string]: Message[] }, message) => {
      const threadId = message.parent_message_id || message.id;
      if (!acc[threadId]) {
        acc[threadId] = [];
      }
      acc[threadId].push(message);
      return acc;
    }, {});
  }, [memoizedMessages]);

  // Filter out just the root messages (those without parent_message_id)
  const rootMessages = useMemo(() => {
    return memoizedMessages.filter(message => !message.parent_message_id);
  }, [memoizedMessages]);

  const renderMessage = (message: Message, isThreadReply = false) => (
    <div 
      ref={(el) => observeMessage(el)}
      key={message.id}
      data-message-id={message.id}
      className={`flex gap-3 ${
        message.sender.id === currentUserId ? 'flex-row-reverse' : 'flex-row'
      } ${isThreadReply ? 'ml-10 mt-2 mb-2' : 'mb-3'}`}
    >
      {message.sender.id !== currentUserId && (
        <Avatar className="h-9 w-9 shrink-0 mt-1">
          <AvatarImage 
            src={message.sender.avatarUrl} 
            alt={message.sender.name}
            className="object-cover"
            loading="lazy"
          />
          <AvatarFallback className="bg-purple-100 text-purple-600 text-sm font-medium">
            {getInitials(message.sender.name)}
          </AvatarFallback>
        </Avatar>
      )}
      <div className={`flex-1 max-w-[75%] space-y-1.5 ${
        message.sender.id === currentUserId ? 'items-end' : 'items-start'
      }`}>
        {!isThreadReply && message.sender.id !== currentUserId && (
          <span className="text-xs font-medium text-gray-600 ml-1 mb-1 block">
            {message.sender.name}
          </span>
        )}
        <div className={`group relative ${
          message.sender.id === currentUserId 
            ? 'bg-[#E7FFDB] text-gray-900 rounded-tl-2xl rounded-br-2xl rounded-bl-2xl shadow-sm' 
            : 'bg-white text-gray-900 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl shadow-sm border border-gray-100'
        } px-4 py-2.5 break-words ${message.isOptimistic ? 'opacity-70' : ''}`}>
          <div className="text-[15px] mb-4">{message.content}</div>
          <div className="absolute right-4 bottom-2 flex items-center gap-1">
            <span className="text-[11px] text-gray-500">
              {format(message.timestamp, 'HH:mm')}
            </span>
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2">
            {message.sender.id === currentUserId && !message.isOptimistic && (
              <button
                onClick={() => onDeleteMessage(message.id)}
                className="p-1.5 rounded-full hover:bg-gray-100"
                aria-label="Supprimer le message"
                disabled={message.isOptimistic}
              >
                <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
              </button>
            )}
            {!isThreadReply && setReplyTo && !message.isOptimistic && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyTo(message)}
                className="p-1.5 rounded-full hover:bg-gray-100"
                disabled={message.isOptimistic}
              >
                <MessageCircle className="h-4 w-4 text-gray-500" />
              </Button>
            )}
          </div>
        </div>
        {message.attachments && message.attachments.map((attachment, index) => (
          <div key={index} className="relative group max-w-sm mt-2">
            <MessageAttachment
              url={attachment.url}
              filename={attachment.filename}
              locale="fr"
            />
          </div>
        ))}
      </div>
    </div>
  );

  // Render loading indicator for older messages
  const renderLoadingTrigger = () => (
    <div ref={loadTriggerRef} className="flex justify-center py-4">
      {hasMore && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-[250px] rounded-xl" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-14 w-[200px] rounded-xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div 
      ref={containerRef}
      className="space-y-6 p-4 md:p-6 bg-[#F8F9FA] min-h-full rounded-md overflow-y-auto"
      style={{ scrollBehavior: isScrollingUp ? 'auto' : 'smooth' }}
    >
      {/* Loading indicator for older messages */}
      {renderLoadingTrigger()}
      
      {/* Actual messages */}
      {memoizedMessages.length === 0 && !isLoading ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-gray-500 text-center">Aucun message</p>
        </div>
      ) : (
        // Render messages grouped by date to prevent flickering
        Object.entries(messageDateGroups).map(([dateKey, dateMessages]) => {
          // Get the first message in this date group to display the date header
          const firstMessageInGroup = dateMessages[0];
          
          return (
            <React.Fragment key={dateKey}>
              <div className="flex justify-center my-4">
                <div className="bg-[#E2E2E2] text-[#8A898C] px-4 py-1.5 rounded-full text-[13px] font-medium shadow-sm">
                  {formatMessageDate(firstMessageInGroup.timestamp)}
                </div>
              </div>
              
              {dateMessages.map((message) => (
                <React.Fragment key={message.id}>
                  {renderMessage(message)}
                  
                  {messageThreads[message.id]?.length > 1 && (
                    <div className="ml-12 mt-2 mb-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleThread(message.id)}
                        className="text-xs text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1 h-auto"
                      >
                        {expandedThreads.has(message.id) ? (
                          <ChevronDown className="h-3.5 w-3.5 mr-1" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 mr-1" />
                        )}
                        {messageThreads[message.id].length - 1} réponses
                      </Button>
                      
                      {expandedThreads.has(message.id) && (
                        <div className="space-y-2 mt-2 pl-2 border-l-2 border-gray-200">
                          {messageThreads[message.id]
                            .filter(reply => reply.id !== message.id)
                            .map(reply => renderMessage(reply, true))}
                        </div>
                      )}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        })
      )}
      
      {messagesEndRef && <div ref={messagesEndRef} className="h-1" />}
    </div>
  );
};
