
import React, { useState, useRef, useEffect } from 'react';
import { Message } from "@/types/messaging";
import { MessageAttachment } from './MessageAttachment';
import { Trash2, MessageCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { useMessageVisibility } from '@/hooks/useMessageVisibility';
import { useTimestampFormat } from '@/hooks/useTimestampFormat';
import { useIsMobile } from '@/hooks/use-mobile';
import { EmojiPicker } from './EmojiPicker';
import { MessageReaction } from './MessageReaction';

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
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const { observeMessage } = useMessageVisibility(channelId);
  const { formatMessageTime } = useTimestampFormat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages]);

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

  const messageThreads = messages.reduce((acc: { [key: string]: Message[] }, message) => {
    const threadId = message.parent_message_id || message.id;
    if (!acc[threadId]) {
      acc[threadId] = [];
    }
    acc[threadId].push(message);
    return acc;
  }, {});

  const rootMessages = messages.filter(message => !message.parent_message_id);

  const renderReactions = (message: Message) => {
    if (!message.reactions || Object.keys(message.reactions).length === 0) {
      return null;
    }

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(message.reactions).map(([emoji, userIds]) => {
          if (userIds.length === 0) return null;
          
          const isActive = currentUserId ? userIds.includes(currentUserId) : false;
          
          return (
            <MessageReaction
              key={`${message.id}-${emoji}`}
              emoji={emoji}
              count={userIds.length}
              isActive={isActive}
              onClick={() => onReactToMessage(message.id, emoji)}
            />
          );
        })}
      </div>
    );
  };

  const renderMessage = (message: Message, isThreadReply = false) => (
    <div 
      ref={(el) => observeMessage(el)}
      key={message.id}
      data-message-id={message.id}
      className={`flex gap-3 ${
        message.sender.id === currentUserId ? 'flex-row-reverse' : 'flex-row'
      } ${isThreadReply ? 'ml-10 mt-2 mb-2' : 'mb-4'}`}
    >
      {message.sender.id !== currentUserId && (
        <Avatar className="h-10 w-10 shrink-0 mt-1">
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
      <div className={`flex-1 max-w-[75%] space-y-1.5 relative group ${
        message.sender.id === currentUserId ? 'items-end' : 'items-start'
      }`}>
        {!isThreadReply && message.sender.id !== currentUserId && (
          <span className="text-sm font-medium text-gray-700 ml-1 mb-1 block">
            {message.sender.name}
          </span>
        )}
        <div className={`group relative ${
          message.sender.id === currentUserId 
            ? 'bg-[#E7FFDB] text-gray-900 rounded-tl-2xl rounded-br-2xl rounded-bl-2xl shadow-sm' 
            : 'bg-white text-gray-900 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl shadow-sm border border-gray-100'
        } px-4 py-3 break-words overflow-hidden`}>
          <div className="text-base mb-5 overflow-wrap-anywhere">{message.content}</div>
          <div className="absolute right-4 bottom-2 flex items-center gap-1">
            <span className="text-xs text-gray-500">
              {formatMessageTime(message.timestamp)}
            </span>
          </div>
        </div>
        
        {renderReactions(message)}
        
        <div className="flex items-center gap-2 mt-1 mr-1">
          <EmojiPicker 
            onEmojiSelect={(emoji) => onReactToMessage(message.id, emoji)}
            size="sm"
          />
          
          {message.sender.id === currentUserId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteMessage(message.id)}
              className="p-1 rounded-full hover:bg-gray-100 bg-white/90 shadow-sm h-auto"
              aria-label="Supprimer le message"
            >
              <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
            </Button>
          )}
          {!isThreadReply && setReplyTo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyTo(message)}
              className="p-1 rounded-full hover:bg-gray-100 bg-white/90 shadow-sm h-auto"
            >
              <MessageCircle className="h-4 w-4 text-gray-500" />
            </Button>
          )}
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
    <div className="space-y-6 p-4 md:p-5 bg-[#F8F9FA] min-h-full rounded-md flex flex-col overflow-x-hidden overscroll-x-none">
      <div className="flex-1">
        {messages.map((message, index) => (
          <React.Fragment key={message.id}>
            {shouldShowDate(message, messages[index - 1]) && (
              <div className="flex justify-center my-5">
                <div className="bg-[#E2E2E2] text-[#8A898C] px-4 py-1.5 rounded-full text-sm font-medium shadow-sm">
                  {formatMessageDate(message.timestamp)}
                </div>
              </div>
            )}
            {renderMessage(message)}
            
            {messageThreads[message.id]?.length > 1 && (
              <div className="ml-12 mt-2 mb-5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleThread(message.id)}
                  className="text-xs text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1.5 h-auto"
                >
                  {expandedThreads.has(message.id) ? (
                    <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {messageThreads[message.id].length - 1} réponses
                </Button>
                
                {expandedThreads.has(message.id) && (
                  <div className="space-y-2 mt-3 pl-3 border-l-2 border-gray-200">
                    {messageThreads[message.id]
                      .filter(reply => reply.id !== message.id)
                      .map(reply => renderMessage(reply, true))}
                  </div>
                )}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
};
