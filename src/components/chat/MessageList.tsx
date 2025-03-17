
import React, { useState, useRef, useEffect } from 'react';
import { Message, MessageListProps } from "@/types/messaging";
import { MessageAttachment } from './MessageAttachment';
import { Trash2, MessageCircle, ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { useMessageVisibility } from '@/hooks/useMessageVisibility';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onDeleteMessage,
  onReactToMessage,
  replyTo,
  setReplyTo,
  channelId,
  isDeleting,
  isLoadingMore,
  hasMoreMessages,
  onLoadMore,
}) => {
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const { observeMessage } = useMessageVisibility(channelId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadTriggerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const prevMessageLengthRef = useRef(messages.length);
  
  // Scroll to bottom on initial load or when user clicks "New messages"
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    setHasNewMessages(false);
  };

  // Setup intersection observer for infinite scrolling
  useEffect(() => {
    const loadTrigger = loadTriggerRef.current;
    if (!loadTrigger || !hasMoreMessages || !onLoadMore) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && hasMoreMessages) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );
    
    observer.observe(loadTrigger);
    
    return () => {
      if (loadTrigger) observer.unobserve(loadTrigger);
    };
  }, [onLoadMore, isLoadingMore, hasMoreMessages]);

  // Check if new messages arrived and user is not at bottom
  useEffect(() => {
    if (messages.length > prevMessageLengthRef.current && !isAtBottom) {
      setHasNewMessages(true);
    }
    prevMessageLengthRef.current = messages.length;
  }, [messages.length, isAtBottom]);

  useEffect(() => {
    // Scroll to bottom on initial load
    if (!isLoadingMore && messages.length > 0) {
      scrollToBottom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Track scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const { scrollHeight, scrollTop, clientHeight } = container;
      const atBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 20;
      setIsAtBottom(atBottom);
      
      if (atBottom) {
        setHasNewMessages(false);
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

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

  const shouldShowDate = (currentMessage: Message, previousMessage?: Message) => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.timestamp);
    const previousDate = new Date(previousMessage.timestamp);
    
    return (
      currentDate.getDate() !== previousDate.getDate() ||
      currentDate.getMonth() !== previousMessage.timestamp.getMonth() ||
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

  const messageThreads = messages.reduce((acc: { [key: string]: Message[] }, message) => {
    const threadId = message.parent_message_id || message.id;
    if (!acc[threadId]) {
      acc[threadId] = [];
    }
    acc[threadId].push(message);
    return acc;
  }, {});

  const rootMessages = messages.filter(message => !message.parent_message_id);

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
        } px-4 py-2.5 break-words`}>
          <div className="text-[15px] mb-4">{message.content}</div>
          <div className="absolute right-4 bottom-2 flex items-center gap-1">
            <span className="text-[11px] text-gray-500">
              {format(message.timestamp, 'HH:mm')}
            </span>
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2">
            {message.sender.id === currentUserId && (
              <button
                onClick={() => onDeleteMessage(message.id)}
                className="p-1.5 rounded-full hover:bg-gray-100"
                aria-label="Supprimer le message"
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
              </button>
            )}
            {!isThreadReply && setReplyTo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyTo(message)}
                className="p-1.5 rounded-full hover:bg-gray-100"
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

  return (
    <div className="relative h-full">
      <div
        ref={scrollContainerRef}
        className="space-y-6 p-4 md:p-6 bg-[#F8F9FA] min-h-full h-full overflow-y-auto rounded-md"
      >
        {/* Show loading indicator or load more button at the top when more messages are available */}
        {(hasMoreMessages || isLoadingMore) && (
          <div ref={loadTriggerRef} className="flex justify-center pb-2">
            {isLoadingMore ? (
              <div className="flex flex-col items-center space-y-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="text-xs text-gray-600"
              >
                Charger les messages précédents
              </Button>
            )}
          </div>
        )}

        {messages.map((message, index) => (
          <React.Fragment key={message.id}>
            {shouldShowDate(message, messages[index - 1]) && (
              <div className="flex justify-center my-4">
                <div className="bg-[#E2E2E2] text-[#8A898C] px-4 py-1.5 rounded-full text-[13px] font-medium shadow-sm">
                  {formatMessageDate(message.timestamp)}
                </div>
              </div>
            )}
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
        <div ref={messagesEndRef} />
      </div>
      
      {/* New messages indicator */}
      {hasNewMessages && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <Button
            variant="secondary"
            size="sm"
            onClick={scrollToBottom}
            className="text-xs shadow-md flex items-center gap-1 px-3 py-2 rounded-full bg-white border border-gray-200"
          >
            <ChevronDown className="h-4 w-4" />
            Nouveaux messages
          </Button>
        </div>
      )}
    </div>
  );
};
