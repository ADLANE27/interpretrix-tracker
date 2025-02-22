
import React, { useState } from 'react';
import { Message } from "@/types/messaging";
import { MessageAttachment } from './MessageAttachment';
import { Trash2, MessageCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Avatar } from "@/components/ui/avatar";
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from "@/components/ui/button";

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onReactToMessage: (messageId: string, emoji: string) => Promise<void>;
  replyTo?: Message | null;
  setReplyTo?: (message: Message | null) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onDeleteMessage,
  onReactToMessage,
  replyTo,
  setReplyTo,
}) => {
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

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

  // Group messages by thread
  const messageThreads = messages.reduce((acc: { [key: string]: Message[] }, message) => {
    const threadId = message.parent_message_id || message.id;
    if (!acc[threadId]) {
      acc[threadId] = [];
    }
    acc[threadId].push(message);
    return acc;
  }, {});

  // Get root messages (messages without parent)
  const rootMessages = messages.filter(message => !message.parent_message_id);

  const renderMessage = (message: Message, isThreadReply = false) => (
    <div className={`flex gap-3 ${
      message.sender.id === currentUserId ? 'flex-row-reverse' : 'flex-row'
    } ${isThreadReply ? 'ml-8 mt-2' : ''}`}>
      <Avatar className="h-8 w-8 shrink-0">
        {message.sender.avatarUrl ? (
          <img src={message.sender.avatarUrl} alt={message.sender.name} />
        ) : (
          <div className="bg-purple-100 text-purple-600 w-full h-full flex items-center justify-center text-sm font-medium">
            {getInitials(message.sender.name)}
          </div>
        )}
      </Avatar>
      <div className={`flex-1 max-w-[70%] space-y-1 ${
        message.sender.id === currentUserId ? 'items-end' : 'items-start'
      }`}>
        <div className={`flex items-center gap-2 text-sm ${
          message.sender.id === currentUserId ? 'flex-row-reverse' : 'flex-row'
        }`}>
          <span className="font-medium">{message.sender.name}</span>
          <span className="text-gray-500 text-xs">
            {format(message.timestamp, 'HH:mm', { locale: fr })}
          </span>
        </div>
        <div className={`group relative ${
          message.sender.id === currentUserId 
            ? 'bg-purple-50 text-purple-900' 
            : 'bg-gray-50 text-gray-900'
        } rounded-lg px-4 py-2`}>
          <div className="text-sm break-words">{message.content}</div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
          <div key={index} className="relative group">
            <MessageAttachment
              url={attachment.url}
              filename={attachment.filename}
              locale="fr"
            />
            {message.sender.id === currentUserId && (
              <button
                onClick={() => onDeleteMessage(message.id)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                aria-label="Supprimer la pièce jointe"
              >
                <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {rootMessages.map((message, index) => (
        <React.Fragment key={message.id}>
          {shouldShowDate(message, messages[index - 1]) && (
            <div className="flex justify-center my-4">
              <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                {formatMessageDate(message.timestamp)}
              </div>
            </div>
          )}
          {renderMessage(message)}
          
          {/* Thread replies */}
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
