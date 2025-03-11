import React, { useState, useRef } from 'react';
import { Message } from "@/types/messaging";
import { MessageAttachment } from './MessageAttachment';
import { Trash2, MessageCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Avatar } from "@/components/ui/avatar";
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { useMessageVisibility } from '@/hooks/useMessageVisibility';
import { cn } from "@/lib/utils";

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
      className={cn(
        "group transition-colors hover:bg-accent/5",
        "px-4 py-2.5 relative",
        isThreadReply ? "ml-12 border-l-2 border-accent/10" : "",
        message.sender.id === currentUserId ? "hover:bg-blue-50/50 dark:hover:bg-blue-950/20" : "hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
      )}
    >
      <div className="flex gap-3 relative">
        <div className="flex-shrink-0">
          <Avatar className={cn(
            "h-9 w-9 ring-2 transition-shadow",
            message.sender.id === currentUserId ? "ring-blue-200" : "ring-purple-200",
          )}>
            {message.sender.avatarUrl ? (
              <img 
                src={message.sender.avatarUrl} 
                alt={message.sender.name}
                className="h-full w-full object-cover rounded-full"
              />
            ) : (
              <div className={cn(
                "w-full h-full flex items-center justify-center text-sm font-medium rounded-full",
                message.sender.id === currentUserId ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
              )}>
                {getInitials(message.sender.name)}
              </div>
            )}
          </Avatar>
        </div>
        
        <div className="flex-1 min-w-0 max-w-[85%] space-y-1">
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "font-medium text-[0.95rem]",
              message.sender.id === currentUserId ? "text-blue-900 dark:text-blue-300" : "text-purple-900 dark:text-purple-300"
            )}>
              {message.sender.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(message.timestamp, 'HH:mm', { locale: fr })}
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm text-foreground/90 break-words leading-relaxed">
              {message.content}
            </div>
            
            {message.attachments && message.attachments.map((attachment, index) => (
              <div key={index} className="relative group/attachment">
                <MessageAttachment
                  url={attachment.url}
                  filename={attachment.filename}
                  locale="fr"
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-0 flex items-center gap-1">
          {message.sender.id === currentUserId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteMessage(message.id)}
              className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {!isThreadReply && setReplyTo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyTo(message)}
              className="h-8 w-8 p-0 rounded-full hover:bg-accent/10"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {messages.map((message, index) => (
        <React.Fragment key={message.id}>
          {shouldShowDate(message, messages[index - 1]) && (
            <div className="flex justify-center my-6">
              <div className="bg-accent/10 text-foreground/70 px-4 py-1.5 rounded-full text-xs font-medium">
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
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {expandedThreads.has(message.id) ? (
                  <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 mr-1.5" />
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
