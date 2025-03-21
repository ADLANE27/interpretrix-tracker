
import React, { useState, useRef, useEffect } from 'react';
import { Message } from "@/types/messaging";
import { MessageAttachment } from './MessageAttachment';
import { Trash2, MessageCircle, ChevronDown, ChevronRight, Smile, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { useMessageVisibility } from '@/hooks/useMessageVisibility';
import { useTimestampFormat } from '@/hooks/useTimestampFormat';
import { useIsMobile } from '@/hooks/use-mobile';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useTheme } from 'next-themes';

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
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const { observeMessage } = useMessageVisibility(channelId);
  const { formatMessageTime } = useTimestampFormat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { theme } = useTheme();

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
      currentDate.getMonth() !== previousMessage.timestamp.getMonth() ||
      currentDate.getFullYear() !== previousDate.getFullYear()
    );
  };

  const shouldShowSender = (currentMessage: Message, previousMessage?: Message) => {
    if (!previousMessage) return true;
    
    // If different senders, always show
    if (currentMessage.sender.id !== previousMessage.sender.id) return true;
    
    // If same sender but messages are far apart in time (> 5 minutes), show sender again
    const currentTime = new Date(currentMessage.timestamp).getTime();
    const previousTime = new Date(previousMessage.timestamp).getTime();
    const fiveMinutesInMs = 5 * 60 * 1000;
    
    return (currentTime - previousTime) > fiveMinutesInMs;
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
    if (!message.reactions || Object.keys(message.reactions).length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(message.reactions).map(([emoji, users]) => (
          <div 
            key={emoji} 
            className={`text-xs rounded-full px-2 py-0.5 flex items-center gap-1 cursor-pointer ${
              users.includes(currentUserId || '') 
                ? 'bg-primary/20 dark:bg-primary/30' 
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            onClick={() => onReactToMessage(message.id, emoji)}
          >
            <span>{emoji}</span>
            <span className="text-gray-600 dark:text-gray-400">{users.length}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderMessage = (message: Message, index: number, isThreadReply = false) => {
    const previousMessage = index > 0 ? messages[index - 1] : undefined;
    const showSender = shouldShowSender(message, previousMessage);
    const isSelfMessage = message.sender.id === currentUserId;

    return (
      <div 
        ref={(el) => observeMessage(el)}
        key={message.id}
        data-message-id={message.id}
        onMouseEnter={() => setHoveredMessageId(message.id)}
        onMouseLeave={() => setHoveredMessageId(null)}
        className={`group px-4 py-0.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
          isThreadReply ? 'ml-10 pl-3' : ''
        }`}
      >
        {/* Show date separator if needed */}
        {!isThreadReply && shouldShowDate(message, previousMessage) && (
          <div className="flex justify-center my-4">
            <div className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-4 py-1 rounded-full text-xs font-medium">
              {formatMessageDate(message.timestamp)}
            </div>
          </div>
        )}

        {/* Message content */}
        <div className="flex items-start gap-2 relative">
          {/* Avatar - only show for first message in a group */}
          {showSender ? (
            <Avatar className="h-9 w-9 mt-1 flex-shrink-0">
              <AvatarImage 
                src={message.sender.avatarUrl} 
                alt={message.sender.name}
                className="object-cover"
              />
              <AvatarFallback className="bg-purple-100 text-purple-600 text-sm font-medium">
                {getInitials(message.sender.name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-9 flex-shrink-0"></div>
          )}

          <div className="flex-1 min-w-0">
            {/* Sender info and timestamp - only for first message in group */}
            {showSender && (
              <div className="flex items-baseline mb-1">
                <span className="font-semibold text-sm mr-2">{message.sender.name}</span>
                <span className="text-xs text-gray-500">{formatMessageTime(message.timestamp)}</span>
              </div>
            )}

            {/* Message content */}
            <div className="text-sm break-words pr-10">
              {message.content}
            </div>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 max-w-sm">
                {message.attachments.map((attachment, idx) => (
                  <MessageAttachment
                    key={idx}
                    url={attachment.url}
                    filename={attachment.filename}
                    locale="fr"
                  />
                ))}
              </div>
            )}

            {/* Reactions */}
            {renderReactions(message)}

            {/* Message actions */}
            <div className={`flex items-center gap-1 mt-1 ${
              hoveredMessageId === message.id || isMobile ? 'opacity-100' : 'opacity-0'
            } transition-opacity`}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 h-auto"
                  >
                    <Smile className="h-4 w-4 text-gray-500" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-none shadow-lg" side="top" align="start">
                  <Picker 
                    data={data} 
                    onEmojiSelect={(emoji: any) => {
                      onReactToMessage(message.id, emoji.native);
                    }}
                    theme={theme === 'dark' ? 'dark' : 'light'}
                    previewPosition="none"
                    skinTonePosition="none"
                    perLine={8}
                  />
                </PopoverContent>
              </Popover>
              
              {setReplyTo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyTo(message)}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 h-auto"
                >
                  <MessageCircle className="h-4 w-4 text-gray-500" />
                </Button>
              )}
              
              {isSelfMessage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteMessage(message.id)}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 h-auto"
                >
                  <Trash2 className="h-4 w-4 text-gray-500" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Thread replies */}
        {!isThreadReply && messageThreads[message.id]?.length > 1 && (
          <div className="ml-11 mt-1 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleThread(message.id)}
              className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md px-2 py-1 h-auto"
            >
              {expandedThreads.has(message.id) ? (
                <ChevronDown className="h-3.5 w-3.5 mr-1" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 mr-1" />
              )}
              {messageThreads[message.id].length - 1} réponses
            </Button>
            
            {expandedThreads.has(message.id) && (
              <div className="mt-2 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                {messageThreads[message.id]
                  .filter(reply => reply.id !== message.id)
                  .map(reply => renderMessage(reply, -1, true))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-0 bg-white dark:bg-gray-900 min-h-full rounded-md flex flex-col overflow-x-hidden overscroll-x-none">
      <div className="flex-1">
        {messages.map((message, index) => (
          <React.Fragment key={message.id}>
            {renderMessage(message, index)}
          </React.Fragment>
        ))}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
};
