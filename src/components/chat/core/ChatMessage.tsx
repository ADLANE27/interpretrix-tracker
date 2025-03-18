
import React from 'react';
import { Message } from '@/types/messaging';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format } from 'date-fns';
import { Trash2, MessageCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { MessageAttachment } from "@/components/chat/MessageAttachment";
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
  isCurrentUser: boolean;
  onDelete?: () => Promise<void>;
  onReply?: () => void;
  isThreadReply?: boolean;
  dark?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  isCurrentUser,
  onDelete,
  onReply,
  isThreadReply = false,
  dark = false,
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`flex gap-3 ${
      isCurrentUser ? 'flex-row-reverse' : ''
    } ${isThreadReply ? 'mt-2 mb-2' : 'mb-4'}`}>
      {!isCurrentUser && (
        <Avatar className={`${isThreadReply ? 'h-7 w-7' : 'h-9 w-9'} shrink-0 mt-1`}>
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
      
      <div className={`flex-1 max-w-[${isThreadReply ? '90' : '80'}%] sm:max-w-[75%] space-y-1.5 ${
        isCurrentUser ? 'items-end' : 'items-start'
      }`}>
        {!isThreadReply && !isCurrentUser && (
          <span className="text-xs font-medium text-gray-600 ml-1 mb-1 block">
            {message.sender.name}
          </span>
        )}
        
        <div className={cn(
          "group relative",
          isCurrentUser 
            ? 'bg-[#E7FFDB] text-gray-900 rounded-tl-2xl rounded-br-2xl rounded-bl-2xl shadow-sm' 
            : 'bg-white text-gray-900 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl shadow-sm border border-gray-100',
          dark ? 'dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700' : '',
          `px-${isThreadReply ? '3' : '4'} py-${isThreadReply ? '2' : '2.5'} break-words`
        )}>
          <div className={`text-[${isThreadReply ? '14' : '15'}px] ${isThreadReply ? 'mb-1' : 'mb-4'}`}>
            {message.content}
          </div>
          
          <div className="absolute right-4 bottom-2 flex items-center gap-1">
            <span className={`text-[${isThreadReply ? '10' : '11'}px] text-gray-500 ${dark ? 'dark:text-gray-400' : ''}`}>
              {format(message.timestamp, 'HH:mm')}
            </span>
          </div>
          
          <div className={cn(
            "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
            "absolute bottom-0 left-0 transform translate-y-full pt-2",
            isCurrentUser ? "flex-row-reverse left-0 right-auto" : "flex-row right-0 left-auto"
          )}>
            {isCurrentUser && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete()}
                className="p-1.5 rounded-full hover:bg-gray-100 bg-white shadow-sm"
              >
                <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
              </Button>
            )}
            {!isThreadReply && onReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReply()}
                className="p-1.5 rounded-full hover:bg-gray-100 bg-white shadow-sm"
              >
                <MessageCircle className="h-4 w-4 text-gray-500" />
              </Button>
            )}
          </div>
        </div>

        {message.attachments && message.attachments.length > 0 && message.attachments.map((attachment, index) => (
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
