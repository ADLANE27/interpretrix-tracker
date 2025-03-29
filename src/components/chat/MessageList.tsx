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
import { ScrollArea } from '@/components/ui/scroll-area';

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
  channelId
}) => {
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [openEmojiPickerId, setOpenEmojiPickerId] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const {
    observeMessage
  } = useMessageVisibility(channelId);
  const {
    formatMessageTime
  } = useTimestampFormat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const isMobile = useIsMobile();
  const {
    theme
  } = useTheme();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'auto'
      });
    }
  }, [messages]);

  useEffect(() => {
    if (activeThreadId && threadRefsMap.current.has(activeThreadId)) {
      const threadElement = threadRefsMap.current.get(activeThreadId);
      if (threadElement) {
        setTimeout(() => {
          threadElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }, 100);
      }
    }
  }, [activeThreadId, expandedThreads]);

  const getInitials = (name: string) => {
    return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatMessageDate = (date: Date) => {
    if (isToday(date)) {
      return "Aujourd'hui";
    } else if (isYesterday(date)) {
      return "Hier";
    }
    return format(date, 'EEEE d MMMM yyyy', {
      locale: fr
    });
  };

  const shouldShowDate = (currentMessage: Message, previousMessage?: Message) => {
    if (!previousMessage) return true;
    const currentDate = new Date(currentMessage.timestamp);
    const previousDate = new Date(previousMessage.timestamp);
    return currentDate.getDate() !== previousDate.getDate() || currentDate.getMonth() !== previousDate.getMonth() || currentDate.getFullYear() !== previousDate.getFullYear();
  };

  const shouldShowSender = (currentMessage: Message, previousMessage?: Message) => {
    if (!previousMessage) return true;
    if (currentMessage.sender.id !== previousMessage.sender.id) return true;
    const currentTime = new Date(currentMessage.timestamp).getTime();
    const previousTime = new Date(previousMessage.timestamp).getTime();
    const fiveMinutesInMs = 5 * 60 * 1000;
    return currentTime - previousTime > fiveMinutesInMs;
  };

  const toggleThread = (messageId: string) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
        setActiveThreadId(null);
      } else {
        newSet.add(messageId);
        setActiveThreadId(messageId);
      }
      return newSet;
    });
  };

  const processMessages = () => {
    const messageThreads: {
      [key: string]: Message[];
    } = {};
    const displayMessages: Message[] = [];
    const processedIds = new Set<string>();
    messages.forEach(message => {
      const threadId = message.parent_message_id || message.id;
      if (!messageThreads[threadId]) {
        messageThreads[threadId] = [];
      }
      messageThreads[threadId].push(message);
    });
    messages.forEach(message => {
      if (processedIds.has(message.id)) return;
      if (!message.parent_message_id || !messageThreads[message.parent_message_id]) {
        displayMessages.push(message);
        processedIds.add(message.id);
        if (messageThreads[message.id] && messageThreads[message.id].length > 1) {
          messageThreads[message.id].forEach(reply => {
            if (reply.id !== message.id) {
              processedIds.add(reply.id);
            }
          });
        }
      }
    });
    return {
      displayMessages,
      messageThreads
    };
  };

  const {
    displayMessages,
    messageThreads
  } = processMessages();

  const renderReactions = (message: Message) => {
    if (!message.reactions || Object.keys(message.reactions).length === 0) return null;
    return <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(message.reactions).map(([emoji, users]) => <div key={emoji} className={`text-xs rounded-full px-2 py-0.5 flex items-center gap-1 cursor-pointer ${users.includes(currentUserId || '') ? 'bg-primary/20 dark:bg-primary/30' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}`} onClick={() => onReactToMessage(message.id, emoji)}>
            <span>{emoji}</span>
            <span className="text-gray-600 dark:text-gray-400">{users.length}</span>
          </div>)}
      </div>;
  };

  const handleEmojiSelect = (messageId: string, emoji: any) => {
    onReactToMessage(messageId, emoji.native);
    setOpenEmojiPickerId(null);
  };

  const renderMessage = (message: Message, index: number, isThreadReply = false, previousMessage?: Message) => {
    const showSender = shouldShowSender(message, previousMessage);
    const isSelfMessage = message.sender.id === currentUserId;
    return <div ref={el => {
      if (el) {
        observeMessage(el);
        if (!isThreadReply && messageThreads[message.id]?.length > 1) {
          threadRefsMap.current.set(message.id, el);
        }
      }
    }} key={message.id} data-message-id={message.id} data-is-thread-reply={isThreadReply ? 'true' : 'false'} onMouseEnter={() => setHoveredMessageId(message.id)} onMouseLeave={() => setHoveredMessageId(null)} className="rounded-full">
        {!isThreadReply && index > 0 && shouldShowDate(message, previousMessage) && <div className="flex justify-center my-4">
            <div className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-4 py-1 rounded-full text-xs font-medium">
              {formatMessageDate(message.timestamp)}
            </div>
          </div>}

        <div className="flex items-start gap-2 relative">
          {showSender ? <Avatar className="h-9 w-9 mt-1 flex-shrink-0">
              <AvatarImage src={message.sender.avatar_url} alt={message.sender.name} className="object-cover" />
              <AvatarFallback className="bg-purple-100 text-purple-600 text-sm font-medium">
                {getInitials(message.sender.name)}
              </AvatarFallback>
            </Avatar> : <div className="w-9 flex-shrink-0"></div>}

          <div className="flex-1 min-w-0">
            {showSender && <div className="flex items-baseline mb-1">
                <span className="font-semibold text-sm mr-2">{message.sender.name}</span>
                <span className="text-xs text-gray-500">{formatMessageTime(message.timestamp)}</span>
              </div>}

            <div className="text-sm break-words pr-10">
              {message.content}
            </div>

            {message.attachments && message.attachments.length > 0 && <div className="mt-2 max-w-sm">
                {message.attachments.map((attachment, idx) => <MessageAttachment key={idx} url={attachment.url} name={attachment.name} locale="fr" />)}
              </div>}

            {renderReactions(message)}

            <div className={`flex items-center gap-1 mt-1 ${hoveredMessageId === message.id || isMobile ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
              <Popover open={openEmojiPickerId === message.id} onOpenChange={open => {
              if (open) {
                setOpenEmojiPickerId(message.id);
              } else {
                setOpenEmojiPickerId(null);
              }
            }}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 h-auto">
                    <Smile className="h-4 w-4 text-gray-500" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-none shadow-lg" side="top" align="start">
                  <Picker data={data} onEmojiSelect={(emoji: any) => handleEmojiSelect(message.id, emoji)} theme={theme === 'dark' ? 'dark' : 'light'} previewPosition="none" skinTonePosition="none" perLine={8} />
                </PopoverContent>
              </Popover>
              
              {setReplyTo && <Button variant="ghost" size="sm" onClick={() => setReplyTo(message)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 h-auto">
                  <MessageCircle className="h-4 w-4 text-gray-500" />
                </Button>}
              
              {isSelfMessage && <Button variant="ghost" size="sm" onClick={() => onDeleteMessage(message.id)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 h-auto">
                  <Trash2 className="h-4 w-4 text-gray-500" />
                </Button>}
            </div>
          </div>
        </div>

        {!isThreadReply && messageThreads[message.id]?.length > 1 && <div className="ml-11 mt-1 mb-2" id={`thread-${message.id}`}>
            <Button variant="ghost" size="sm" onClick={() => toggleThread(message.id)} className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md px-2 py-1 h-auto">
              {expandedThreads.has(message.id) ? <ChevronDown className="h-3.5 w-3.5 mr-1" /> : <ChevronRight className="h-3.5 w-3.5 mr-1" />}
              {messageThreads[message.id].length - 1} réponses
            </Button>
            
            {expandedThreads.has(message.id) && <div className="mt-2 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                <ScrollArea className="max-h-80">
                  {messageThreads[message.id].filter(reply => reply.id !== message.id).map((reply, idx, replies) => renderMessage(reply, idx, true, idx > 0 ? replies[idx - 1] : undefined))}
                </ScrollArea>
              </div>}
          </div>}
      </div>;
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 rounded-md w-full h-full overflow-hidden">
      <ScrollArea className="flex-1 px-4 py-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            Aucun message à afficher
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div key={message.id}>
                {renderMessage(message, index, false, index > 0 ? messages[index - 1] : undefined)}
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>
    </div>
  );
};
