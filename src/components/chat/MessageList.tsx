
import React, { useState, useRef, useEffect } from 'react';
import { Message } from "@/types/messaging";
import { MessageAttachment } from './MessageAttachment';
import { Trash2, MessageCircle, ChevronDown, ChevronRight, ThumbsUp } from 'lucide-react';
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

  // Organize messages into parent/reply structure
  const rootMessages = messages.filter(message => !message.parent_message_id);
  const messageThreads = messages.reduce((acc: { [key: string]: Message[] }, message) => {
    const threadId = message.parent_message_id || message.id;
    if (!acc[threadId]) {
      acc[threadId] = [];
    }
    acc[threadId].push(message);
    return acc;
  }, {});

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

  const renderReactions = (message: Message) => {
    // Return early if no reactions
    if (!message.reactions || Object.keys(message.reactions).length === 0) {
      return null;
    }

    // Use the new dark theme styling for reactions
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(message.reactions).map(([emoji, userIds]) => {
          // Skip entries with no users
          if (!userIds || userIds.length === 0) return null;
          
          // Check if current user has reacted with this emoji
          const isActive = currentUserId ? userIds.includes(currentUserId) : false;
          
          // For thumbs up emoji, use the special dark theme styling
          if (emoji === '👍') {
            return (
              <div 
                key={`${message.id}-${emoji}`}
                className="flex items-center bg-[#222222] rounded-full cursor-pointer hover:bg-[#333333] transition-colors px-2 py-1"
                onClick={() => onReactToMessage(message.id, emoji)}
              >
                <ThumbsUp 
                  className={`h-4 w-4 mr-1 ${isActive ? 'text-[#FFD700]' : 'text-[#999999]'}`} 
                  fill={isActive ? '#FFD700' : 'none'} 
                />
                <span className="text-xs font-medium text-white">{userIds.length}</span>
              </div>
            );
          }
          
          // For other emoji reactions
          return (
            <div
              key={`${message.id}-${emoji}`}
              className="flex items-center bg-[#222222] rounded-full cursor-pointer hover:bg-[#333333] transition-colors px-2 py-1"
              onClick={() => onReactToMessage(message.id, emoji)}
            >
              <span className="mr-1 text-base">{emoji}</span>
              <span className="text-xs font-medium text-white">{userIds.length}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMessage = (message: Message, isThreadReply = false) => {
    const isCurrentUser = message.sender.id === currentUserId;

    return (
      <div 
        ref={(el) => el && observeMessage(el)}
        key={message.id}
        data-message-id={message.id}
        className={`flex gap-3 ${
          isCurrentUser ? 'flex-row-reverse' : 'flex-row'
        } ${isThreadReply ? 'ml-10 mt-2 mb-2' : 'mb-4'}`}
      >
        {!isCurrentUser && (
          <Avatar className="h-10 w-10 shrink-0 mt-1 rounded-md overflow-hidden">
            <AvatarImage 
              src={message.sender.avatarUrl} 
              alt={message.sender.name}
              className="object-cover"
            />
            <AvatarFallback className="bg-[#403E43] text-gray-200 text-sm font-medium">
              {getInitials(message.sender.name)}
            </AvatarFallback>
          </Avatar>
        )}
        <div className={`flex-1 max-w-[75%] space-y-1.5 relative group ${
          isCurrentUser ? 'items-end' : 'items-start'
        }`}>
          {!isThreadReply && !isCurrentUser && (
            <div className="flex items-baseline space-x-2">
              <span className="text-sm font-bold text-white">
                {message.sender.name}
              </span>
              <span className="text-xs text-gray-400">
                {formatMessageTime(message.timestamp)}
              </span>
            </div>
          )}
          <div className={`relative ${
            isCurrentUser 
              ? 'bg-[#070F2B] text-white rounded-t-xl rounded-bl-xl rounded-br-sm' 
              : 'bg-[#221F26] text-white rounded-t-xl rounded-br-xl rounded-bl-sm'
          } px-4 py-3 break-words overflow-hidden`}>
            <div className="text-base">{message.content}</div>
            {isCurrentUser && (
              <div className="absolute right-2 bottom-1 flex items-center gap-1">
                <span className="text-xs text-gray-400">
                  {formatMessageTime(message.timestamp)}
                </span>
              </div>
            )}
          </div>
          
          {/* Render reactions with new styling */}
          {renderReactions(message)}
          
          <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Quick thumbs up reaction button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReactToMessage(message.id, '👍')}
              className="p-1 rounded-full hover:bg-[#333333] h-auto bg-[#222222] text-gray-400"
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            
            <EmojiPicker 
              onEmojiSelect={(emoji) => onReactToMessage(message.id, emoji)}
              size="sm"
            />
            
            {isCurrentUser && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteMessage(message.id)}
                className="p-1 rounded-full hover:bg-[#333333] h-auto bg-[#222222] text-gray-400"
                aria-label="Supprimer le message"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {!isThreadReply && setReplyTo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyTo(message)}
                className="p-1 rounded-full hover:bg-[#333333] h-auto bg-[#222222] text-gray-400"
              >
                <MessageCircle className="h-4 w-4" />
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
  };

  return (
    <div className="space-y-6 p-4 md:p-5 bg-[#000000e6] min-h-full rounded-md flex flex-col overflow-x-hidden overscroll-x-none">
      <div className="flex-1">
        {rootMessages.map((message, index) => {
          return (
            <React.Fragment key={message.id}>
              {shouldShowDate(message, rootMessages[index - 1]) && (
                <div className="flex justify-center my-5">
                  <div className="bg-[#333333] text-gray-300 px-4 py-1.5 rounded-full text-sm font-medium">
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
                    className="text-xs text-gray-300 hover:text-white bg-[#333333] hover:bg-[#444444] rounded-full px-3 py-1.5 h-auto"
                  >
                    {expandedThreads.has(message.id) ? (
                      <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {messageThreads[message.id].length - 1} réponses
                  </Button>
                  
                  {expandedThreads.has(message.id) && (
                    <div className="space-y-2 mt-3 pl-3 border-l-2 border-[#444444]">
                      {messageThreads[message.id]
                        .filter(reply => reply.id !== message.id)
                        .map(reply => renderMessage(reply, true))}
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
};
