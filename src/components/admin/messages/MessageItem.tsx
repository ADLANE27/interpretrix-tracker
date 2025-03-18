
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { MessageSquare, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { MessageAttachment } from "@/components/chat/MessageAttachment";

interface MessageSender {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  channel_id: string;
  sender_id: string;
  parent_message_id?: string | null;
  sender?: MessageSender;
}

interface MessageItemProps {
  message: Message;
  currentUserId: any;
  onDelete: (messageId: string, senderId: string) => void;
  onReply: (message: Message) => void;
  isReply?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({ 
  message, 
  currentUserId, 
  onDelete, 
  onReply,
  isReply = false
}) => {
  const isCurrentUser = message.sender?.id === currentUserId?.id;

  const renderMessageContent = () => {
    try {
      const data = JSON.parse(message.content);
      if (data.type === 'attachment' && data.file) {
        return <MessageAttachment url={data.file.url} filename={data.file.name} locale="fr" />;
      }
    } catch (e) {
      return message.content;
    }
    return message.content;
  };

  return (
    <div 
      key={message.id} 
      className={`group relative mb-${isReply ? '2' : '4'} ${isCurrentUser ? 'flex flex-row-reverse' : 'flex'}`}
    >
      {!isCurrentUser && (
        <Avatar className={`${isReply ? 'h-7 w-7' : 'h-9 w-9'} shrink-0 mt-1`}>
          {message.sender?.avatarUrl && (
            <AvatarImage src={message.sender.avatarUrl} alt={message.sender?.name || 'User'} className="object-cover" />
          )}
          <AvatarFallback className="bg-purple-100 text-purple-600 text-sm font-medium">
            {message.sender?.name?.substring(0, 2).toUpperCase() || '??'}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`flex-1 max-w-[${isReply ? '80' : '75'}%] space-y-1.5 ${
        isCurrentUser ? 'items-end mr-2' : 'items-start ml-2'
      }`}>
        {!isCurrentUser && (
          <span className={`text-xs font-medium text-gray-600 ml-1 ${isReply ? '' : 'mb-1 block'}`}>
            {message.sender?.name}
          </span>
        )}
        
        <div className={`group relative ${
          isCurrentUser 
            ? 'bg-[#E7FFDB] text-gray-900 rounded-tl-2xl rounded-br-2xl rounded-bl-2xl ml-auto' 
            : 'bg-white text-gray-900 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl shadow-sm border border-gray-100'
        } px-${isReply ? '3' : '4'} py-${isReply ? '2' : '2.5'} break-words`}>
          <div className={`text-[${isReply ? '14' : '15'}px] ${isReply ? '' : 'mb-4'}`}>
            {renderMessageContent()}
          </div>
          
          <div className="absolute right-4 bottom-2 flex items-center gap-1">
            <span className={`text-[${isReply ? '10' : '11'}px] text-gray-500`}>
              {format(new Date(message.created_at), 'HH:mm')}
            </span>
          </div>
        </div>

        {!isReply && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2">
            {isCurrentUser && (
              <button
                onClick={() => onDelete(message.id, message.sender_id)}
                className="p-1.5 rounded-full hover:bg-gray-100"
                aria-label="Supprimer le message"
              >
                <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
              </button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(message)}
              className="p-1.5 rounded-full hover:bg-gray-100"
            >
              <MessageSquare className="h-4 w-4 text-gray-500" />
            </Button>
          </div>
        )}

        {isReply && isCurrentUser && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2">
            <button
              onClick={() => onDelete(message.id, message.sender_id)}
              className="p-1 rounded-full hover:bg-gray-100"
              aria-label="Supprimer le message"
            >
              <Trash2 className="h-3.5 w-3.5 text-gray-500 hover:text-red-500" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
