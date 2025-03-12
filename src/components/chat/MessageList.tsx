import React, { useState, useRef } from 'react';
import { Message } from "@/types/messaging";
import { MessageAttachment } from './MessageAttachment';
import { Trash2, MessageCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { useMessageVisibility } from '@/hooks/useMessageVisibility';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      data-message-id={message.id}
      className={`flex gap-2 mb-1 ${
        message.sender.id === currentUserId ? 'flex-row-reverse' : 'flex-row'
      } ${isThreadReply ? 'ml-8 mt-1' : ''}`}
    >
      {message.sender.id !== currentUserId && (
        <Avatar className="h-8 w-8 shrink-0">
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
      <div className={`flex-1 max-w-[75%] space-y-1 ${
        message.sender.id === currentUserId ? 'items-end' : 'items-start'
      }`}>
        {!isThreadReply && message.sender.id !== currentUserId && (
          <span className="text-xs font-medium text-gray-600 ml-1">
            {message.sender.name}
          </span>
        )}
        <div className={`group relative ${
          message.sender.id === currentUserId 
            ? 'bg-[#E7FFDB] text-gray-900 rounded-tl-2xl rounded-br-2xl rounded-bl-2xl' 
            : 'bg-white text-gray-900 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl shadow-sm'
        } px-3 py-2 break-words`}>
          <div className="text-[15px]">{message.content}</div>
          <div className="absolute right-2 bottom-1 flex items-center gap-1">
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
          <div key={index} className="relative group max-w-sm">
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
    <div className="space-y-4 px-4 bg-[#F1F1F1] dark:bg-gray-900 min-h-full pb-20">
      {messages.map((message, index) => (
        <React.Fragment key={message.id}>
          {shouldShowDate(message, messages[index - 1]) && (
            <div className="flex justify-center my-3">
              <div className="bg-[#E2E2E2] dark:bg-gray-800 text-[#8A898C] px-3 py-1 rounded-full text-[13px]">
                {formatMessageDate(message.timestamp)}
              </div>
            </div>
          )}
          {renderMessage(message)}
          
          {messageThreads[message.id]?.length > 1 && (
            <div className="ml-12 mt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleThread(message.id)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                {expandedThreads.has(message.id) ? (
                  <ChevronDown className="h-4 w-4 mr-1" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-1" />
                )}
                {messageThreads[message.id].length - 1} réponses
              </Button>
              
              {expandedThreads.has(message.id) && (
                <div className="space-y-1 mt-1">
                  {messageThreads[message.id]
                    .filter(reply => reply.id !== message.id)
                    .map(reply => renderMessage(reply, true))}
                </div>
              )}
            </div>
          )}
        </React.Fragment>
      ))}
      <div ref={messagesEndRef} className="h-4" />
    </div>
  );
};
