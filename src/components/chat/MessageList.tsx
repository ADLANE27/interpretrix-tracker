import React, { Fragment, useRef, useEffect, useState } from 'react';
import { MessageListProps, Message } from '@/types/messaging';
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageAttachment } from './MessageAttachment';
import { 
  Reply, 
  MoreHorizontal, 
  Smile, 
  Trash2, 
  MessageSquare 
} from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onDeleteMessage,
  onReactToMessage,
  replyTo,
  setReplyTo,
  channelId,
}) => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (replyingToMessage && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [replyingToMessage]);

  const groupedMessages: { [key: string]: Message[] } = {};
  
  messages.forEach(message => {
    const date = new Date(message.timestamp);
    const dateStr = date.toDateString();
    
    if (!groupedMessages[dateStr]) {
      groupedMessages[dateStr] = [];
    }
    
    groupedMessages[dateStr].push(message);
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Aujourd\'hui';
    if (isYesterday(date)) return 'Hier';
    return format(date, 'd MMMM yyyy', { locale: fr });
  };

  const formatTime = (date: Date) => {
    return format(date, 'HH:mm');
  };

  const handleReply = (message: Message) => {
    if (setReplyTo) {
      setReplyTo(message);
    } else {
      setReplyingToMessage(message);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    onDeleteMessage(messageId);
  };

  const handleEmojiSelect = (messageId: string, emoji: any) => {
    onReactToMessage(messageId, emoji.native);
    setShowEmojiPicker(null);
  };

  return (
    <div ref={messagesContainerRef} className="flex-1 overflow-auto p-2 sm:p-4">
      {Object.keys(groupedMessages).length === 0 && (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500 text-center">
            Aucun message. Commencez la conversation !
          </p>
        </div>
      )}
      
      {Object.entries(groupedMessages).map(([dateStr, dateMessages]) => (
        <Fragment key={dateStr}>
          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
            <span className="flex-shrink mx-4 text-xs text-gray-500 dark:text-gray-400">
              {formatDate(dateStr)}
            </span>
            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
          </div>
          
          {dateMessages.map((message) => {
            const isCurrentUser = message.sender.id === currentUserId;
            const hasReplies = messages.some(m => m.parent_message_id === message.id);
            const replyCount = messages.filter(m => m.parent_message_id === message.id).length;
            
            const parentMessage = message.parent_message_id 
              ? messages.find(m => m.id === message.parent_message_id) 
              : null;
              
            return (
              <Fragment key={message.id}>
                <div className={`chat-message mb-4 ${message.parent_message_id ? 'ml-8 pl-4 border-l-2 border-gray-200 dark:border-gray-700' : ''}`}>
                  {parentMessage && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      En réponse à {parentMessage.sender.name}
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <Avatar className="h-8 w-8">
                      {message.sender.avatarUrl ? (
                        <AvatarImage src={message.sender.avatarUrl} />
                      ) : (
                        <AvatarFallback>{getInitials(message.sender.name)}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {message.sender.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(new Date(message.timestamp))}
                        </span>
                      </div>
                      <div className="mt-1 text-sm">
                        {message.content}
                      </div>
                      
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((attachment, index) => (
                            <MessageAttachment 
                              key={index}
                              url={attachment.url}
                              filename={attachment.filename}
                              type={attachment.type}
                              size={attachment.size}
                            />
                          ))}
                        </div>
                      )}
                      
                      <div className="mt-1 flex items-center gap-1">
                        <div className="flex-1 flex flex-wrap gap-1 mt-1">
                          {message.reactions && Object.entries(message.reactions).map(([emoji, users]) => (
                            <Button
                              key={emoji}
                              variant="outline"
                              size="sm"
                              className={`h-6 rounded-full text-xs px-2 ${
                                users.includes(currentUserId || '') ? 'bg-primary/10' : ''
                              }`}
                              onClick={() => onReactToMessage(message.id, emoji)}
                            >
                              {emoji} {users.length}
                            </Button>
                          ))}
                        </div>
                        
                        <div className="flex gap-1">
                          <Popover open={showEmojiPicker === message.id} onOpenChange={(open) => !open && setShowEmojiPicker(null)}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setShowEmojiPicker(message.id)}
                              >
                                <Smile className="h-3.5 w-3.5" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                              <Picker
                                data={data}
                                onEmojiSelect={(emoji: any) => handleEmojiSelect(message.id, emoji)}
                                theme="light"
                                previewPosition="none"
                                locale="fr"
                              />
                            </PopoverContent>
                          </Popover>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleReply(message)}
                          >
                            <Reply className="h-3.5 w-3.5" />
                          </Button>
                          
                          {isCurrentUser && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  className="text-destructive flex items-center gap-2 cursor-pointer"
                                  onClick={() => handleDeleteMessage(message.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span>Supprimer</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                      
                      {!message.parent_message_id && hasReplies && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 h-6 text-xs rounded-full flex items-center gap-1"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>{replyCount} {replyCount > 1 ? 'réponses' : 'réponse'}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Fragment>
            );
          })}
        </Fragment>
      ))}
      
      {replyingToMessage && !setReplyTo && (
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-2 border-t border-gray-200 dark:border-gray-700">
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            Répondre à {replyingToMessage.sender.name}
          </div>
          <div className="flex gap-2">
            <Textarea
              placeholder="Écrivez votre réponse..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex flex-col gap-2">
              <Button>Envoyer</Button>
              <Button 
                variant="outline" 
                onClick={() => setReplyingToMessage(null)}
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
