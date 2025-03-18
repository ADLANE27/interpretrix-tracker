
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { MessageSquare, Trash2, Reply } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { MessageAttachment } from "@/components/chat/MessageAttachment";
import { cn } from "@/lib/utils";
import { Message } from "@/types/messaging";

interface ChatMessageProps {
  message: Message;
  isCurrentUser: boolean;
  onDelete?: () => void;
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
    <div 
      data-message-id={message.id}
      className={cn(
        "group flex gap-3 mb-4",
        isCurrentUser ? "flex-row-reverse" : "flex-row",
        isThreadReply ? "ml-8 mt-2" : ""
      )}
    >
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
      
      <div className={cn(
        "flex-1 max-w-[80%] sm:max-w-[75%] space-y-1.5",
        isCurrentUser ? "items-end" : "items-start"
      )}>
        {!isThreadReply && !isCurrentUser && (
          <span className="text-xs font-medium text-gray-600 ml-1 mb-1 block">
            {message.sender.name}
          </span>
        )}
        
        <div className={cn(
          "group relative px-4 py-2.5 break-words",
          isCurrentUser 
            ? "bg-[#E7FFDB] text-gray-900 rounded-tl-2xl rounded-br-2xl rounded-bl-2xl shadow-sm" 
            : "bg-white text-gray-900 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl shadow-sm border border-gray-100",
          dark && isCurrentUser && "bg-primary text-primary-foreground",
          dark && !isCurrentUser && "bg-muted"
        )}>
          <div className={`text-[${isThreadReply ? '14' : '15'}px] ${isThreadReply ? '' : 'mb-4'}`}>
            {message.content}
          </div>
          
          <div className="absolute right-4 bottom-2 flex items-center gap-1">
            <span className={`text-[${isThreadReply ? '10' : '11'}px] text-gray-500`}>
              {format(new Date(message.timestamp), 'HH:mm')}
            </span>
          </div>
        </div>

        {/* Display attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="space-y-2 my-2">
            {message.attachments.map((attachment, index) => (
              <MessageAttachment 
                key={index} 
                url={attachment.url}
                filename={attachment.filename}
                type={attachment.type}
                dark={dark && isCurrentUser} 
              />
            ))}
          </div>
        )}

        {/* Message actions */}
        <div className={cn(
          "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute",
          isCurrentUser ? "flex-row-reverse right-0" : "flex-row left-0",
          isThreadReply ? "bottom-0 translate-y-1/2" : "bottom-0 translate-y-full pt-2"
        )}>
          {isCurrentUser && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="p-1.5 rounded-full hover:bg-gray-100 bg-white shadow-sm"
            >
              <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
            </Button>
          )}
          {!isThreadReply && onReply && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReply}
              className="p-1.5 rounded-full hover:bg-gray-100 bg-white shadow-sm"
            >
              <Reply className="h-4 w-4 text-gray-500" />
              <span className="ml-1 text-xs">Reply</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
