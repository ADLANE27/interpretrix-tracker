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
import { ScrollArea } from "@/components/ui/scroll-area";

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onReactToMessage: (messageId: string, emoji: string) => Promise<void>;
  replyTo?: Message | null;
  setReplyTo?: (message: Message | null) => void;
  channelId: string;
}

const USER_COLORS = [
  { bg: "bg-purple-50/40 hover:bg-purple-50/60", border: "border-purple-200", text: "text-purple-700" },
  { bg: "bg-blue-50/40 hover:bg-blue-50/60", border: "border-blue-200", text: "text-blue-700" },
  { bg: "bg-green-50/40 hover:bg-green-50/60", border: "border-green-200", text: "text-green-700" },
  { bg: "bg-orange-50/40 hover:bg-orange-50/60", border: "border-orange-200", text: "text-orange-700" },
  { bg: "bg-pink-50/40 hover:bg-pink-50/60", border: "border-pink-200", text: "text-pink-700" },
  { bg: "bg-cyan-50/40 hover:bg-cyan-50/60", border: "border-cyan-200", text: "text-cyan-700" },
  { bg: "bg-indigo-50/40 hover:bg-indigo-50/60", border: "border-indigo-200", text: "text-indigo-700" },
];

export const MessageList = React.memo<MessageListProps>(({
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

  const getUserColor = (userId: string) => {
    const colorIndex = Math.abs(userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % USER_COLORS.length;
    return USER_COLORS[colorIndex];
  };

  const renderMessage = (message: Message, isThreadReply = false) => {
    const isCurrentUser = message.sender.id === currentUserId;
    
    return (
      <div 
        ref={(el) => observeMessage(el)}
        data-message-id={message.id}
        className={cn(
          "group flex gap-3",
          "px-3 py-1.5",
          isThreadReply ? "ml-8" : ""
        )}
      >
        {!isCurrentUser && (
          <div className="flex-shrink-0 pt-0.5">
            <Avatar className="h-8 w-8 ring-2 ring-background/10">
              {message.sender.avatarUrl ? (
                <img 
                  src={message.sender.avatarUrl} 
                  alt={message.sender.name}
                  className="h-full w-full object-cover rounded-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-medium rounded-full bg-muted">
                  {getInitials(message.sender.name)}
                </div>
              )}
            </Avatar>
          </div>
        )}
        
        <div className={cn(
          "flex flex-col gap-1 max-w-[80%]",
          isCurrentUser ? "ml-auto" : ""
        )}>
          {!isCurrentUser && (
            <span className="text-xs text-muted-foreground ml-1">
              {message.sender.name}
            </span>
          )}
          
          <div className={cn(
            "rounded-2xl px-4 py-2",
            "break-words",
            isCurrentUser ? 
              "bg-primary text-primary-foreground ml-auto" : 
              "bg-muted text-muted-foreground"
          )}>
            <div className="text-sm leading-relaxed">
              {message.content}
            </div>
            
            {message.attachments && message.attachments.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {message.attachments.map((attachment, index) => (
                  <div key={index} className="group/attachment">
                    <MessageAttachment
                      url={attachment.url}
                      filename={attachment.filename}
                      locale="fr"
                    />
                  </div>
                ))}
              </div>
            )}
            
            <div className="text-xs opacity-70 mt-1 text-right">
              {format(message.timestamp, 'HH:mm', { locale: fr })}
            </div>
          </div>
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 transition-opacity self-start flex items-center gap-1">
          {message.sender.id === currentUserId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteMessage(message.id)}
              className="h-8 w-8 p-0 rounded-full hover:bg-red-100/50 dark:hover:bg-red-900/50 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {!isThreadReply && setReplyTo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyTo(message)}
              className="h-8 w-8 p-0 rounded-full hover:bg-muted/50"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <ScrollArea className="h-full bg-background">
      <div className="space-y-1">
        {messages.map((message, index) => (
          <React.Fragment key={message.id}>
            {shouldShowDate(message, messages[index - 1]) && (
              <div className="flex justify-center py-2">
                <div className="bg-muted/50 text-muted-foreground px-3 py-1 rounded-full text-xs font-medium">
                  {formatMessageDate(message.timestamp)}
                </div>
              </div>
            )}
            {renderMessage(message)}
            
            {messageThreads[message.id]?.length > 1 && (
              <div className="ml-14 mt-0.5 mb-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleThread(message.id)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  {expandedThreads.has(message.id) ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
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
      </div>
    </ScrollArea>
  );
});

MessageList.displayName = 'MessageList';
