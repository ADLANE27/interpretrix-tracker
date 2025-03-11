import React, { useState, useRef } from 'react';
import { Message } from "@/types/messaging";
import { MessageAttachment } from './MessageAttachment';
import { Trash2, MessageCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Avatar } from "@/components/ui/avatar";
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
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(new Set());
  const { observeMessage } = useMessageVisibility(channelId);

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

  const handleDeleteMessage = async (messageId: string) => {
    setDeletedMessageIds(prev => new Set([...prev, messageId]));
    
    try {
      await onDeleteMessage(messageId);
    } catch (error) {
      setDeletedMessageIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
      console.error('Failed to delete message:', error);
    }
  };

  const visibleMessages = messages.filter(message => !deletedMessageIds.has(message.id));

  const renderMessage = (message: Message, isThreadReply = false) => (
    <div 
      ref={(el) => observeMessage(el)}
      data-message-id={message.id}
      className={`group hover:bg-gray-50/50 px-4 py-2 transition-colors ${
        isThreadReply ? 'ml-8' : ''
      }`}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <Avatar className="h-10 w-10 ring-2 ring-purple-200">
            {message.sender.avatarUrl ? (
              <img 
                src={message.sender.avatarUrl} 
                alt={message.sender.name}
                className="h-full w-full object-cover rounded-full"
              />
            ) : (
              <div className="bg-purple-100 text-purple-600 w-full h-full flex items-center justify-center text-sm font-medium rounded-full">
                {getInitials(message.sender.name)}
              </div>
            )}
          </Avatar>
        </div>
        
        <div className="flex-1 max-w-[80%] space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[0.95rem] text-purple-900">{message.sender.name}</span>
            <span className="text-gray-500 text-xs">
              {format(message.timestamp, 'HH:mm', { locale: fr })}
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm break-words text-gray-900">{message.content}</div>
            
            {message.attachments && message.attachments.map((attachment, index) => (
              <div key={index} className="relative group/attachment">
                <MessageAttachment
                  url={attachment.url}
                  filename={attachment.filename}
                  locale="fr"
                />
                {message.sender.id === currentUserId && (
                  <button
                    onClick={() => handleDeleteMessage(message.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-red-50 opacity-0 group-hover/attachment:opacity-100 transition-opacity shadow-sm"
                    aria-label="Supprimer la pièce jointe"
                  >
                    <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-start mt-1">
          {message.sender.id === currentUserId && (
            <button
              onClick={() => handleDeleteMessage(message.id)}
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
    </div>
  );

  return (
    <div className="space-y-6">
      {visibleMessages.map((message, index) => (
        <React.Fragment key={message.id}>
          {shouldShowDate(message, visibleMessages[index - 1]) && (
            <div className="flex justify-center my-4">
              <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                {formatMessageDate(message.timestamp)}
              </div>
            </div>
          )}
          {renderMessage(message)}
          
          {messageThreads[message.id]?.length > 1 && (
            <div className="ml-12 mt-2">
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
                <div className="space-y-2 mt-2">
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
  );
};
