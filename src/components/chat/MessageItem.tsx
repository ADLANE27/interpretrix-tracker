
import React from 'react';
import { Message } from "@/types/messaging";
import { MessageAttachment } from './MessageAttachment';
import { MessageReaction } from './MessageReaction';
import { Trash2, MessageCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useMessageVisibility } from '@/hooks/useMessageVisibility';
import { useTimestampFormat } from '@/hooks/useTimestampFormat';

interface MessageItemProps {
  message: Message;
  currentUserId: string | null;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onReactToMessage: (messageId: string, emoji: string) => Promise<void>;
  setReplyTo?: (message: Message | null) => void;
  isThreadReply?: boolean;
  channelId: string;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUserId,
  onDeleteMessage,
  onReactToMessage,
  setReplyTo,
  isThreadReply = false,
  channelId,
}) => {
  const { observeMessage } = useMessageVisibility(channelId);
  const { formatMessageTime } = useTimestampFormat();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  console.log('[MessageItem] Rendering message with reactions:', message.id, message.reactions);

  return (
    <div 
      ref={(el) => el && observeMessage(el)}
      data-message-id={message.id}
      className={`flex gap-3 ${
        message.sender.id === currentUserId ? 'flex-row-reverse' : 'flex-row'
      } ${isThreadReply ? 'ml-10 mt-2 mb-2' : 'mb-4'}`}
    >
      {message.sender.id !== currentUserId && (
        <Avatar className="h-10 w-10 shrink-0 mt-1">
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
      <div className={`flex-1 max-w-[75%] space-y-1.5 relative group ${
        message.sender.id === currentUserId ? 'items-end' : 'items-start'
      }`}>
        {!isThreadReply && message.sender.id !== currentUserId && (
          <span className="text-sm font-medium text-gray-700 ml-1 mb-1 block">
            {message.sender.name}
          </span>
        )}
        <div className={`group relative ${
          message.sender.id === currentUserId 
            ? 'bg-[#E7FFDB] text-gray-900 rounded-tl-2xl rounded-br-2xl rounded-bl-2xl shadow-sm' 
            : 'bg-white text-gray-900 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl shadow-sm border border-gray-100'
        } px-4 py-3 break-words overflow-hidden`}>
          <div className="text-base mb-5 overflow-wrap-anywhere">{message.content}</div>
          <div className="absolute right-4 bottom-2 flex items-center gap-1">
            <span className="text-xs text-gray-500">
              {formatMessageTime(message.timestamp)}
            </span>
          </div>
        </div>
        
        <div className={`${message.sender.id === currentUserId ? 'justify-end' : 'justify-start'} flex`}>
          <MessageReaction 
            messageId={message.id}
            reactions={message.reactions || {}}
            currentUserId={currentUserId}
            onReactToMessage={onReactToMessage}
          />
        </div>
        
        <div className="flex items-center gap-2 mt-1 mr-1">
          {message.sender.id === currentUserId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteMessage(message.id)}
              className="p-1 rounded-full hover:bg-gray-100 bg-white/90 shadow-sm h-auto"
              aria-label="Supprimer le message"
            >
              <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
            </Button>
          )}
          {!isThreadReply && setReplyTo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyTo(message)}
              className="p-1 rounded-full hover:bg-gray-100 bg-white/90 shadow-sm h-auto"
            >
              <MessageCircle className="h-4 w-4 text-gray-500" />
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
