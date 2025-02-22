
import React from 'react';
import { Message } from "@/types/messaging";
import { MessageAttachment } from './MessageAttachment';
import { Trash2 } from 'lucide-react';
import { Avatar } from "@/components/ui/avatar";
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onReactToMessage: (messageId: string, emoji: string) => Promise<void>;
  replyTo?: Message | null;
  setReplyTo?: (message: Message | null) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onDeleteMessage,
  onReactToMessage,
  replyTo,
  setReplyTo,
}) => {
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

  return (
    <div className="space-y-6">
      {messages.map((message, index) => (
        <React.Fragment key={message.id}>
          {shouldShowDate(message, messages[index - 1]) && (
            <div className="flex justify-center my-4">
              <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                {formatMessageDate(message.timestamp)}
              </div>
            </div>
          )}
          <div className={`flex gap-3 ${
            message.sender.id === currentUserId ? 'flex-row-reverse' : 'flex-row'
          }`}>
            <Avatar className="h-8 w-8 shrink-0">
              {message.sender.avatarUrl ? (
                <img src={message.sender.avatarUrl} alt={message.sender.name} />
              ) : (
                <div className="bg-purple-100 text-purple-600 w-full h-full flex items-center justify-center text-sm font-medium">
                  {getInitials(message.sender.name)}
                </div>
              )}
            </Avatar>
            <div className={`flex-1 max-w-[70%] space-y-1 ${
              message.sender.id === currentUserId ? 'items-end' : 'items-start'
            }`}>
              <div className={`flex items-center gap-2 text-sm ${
                message.sender.id === currentUserId ? 'flex-row-reverse' : 'flex-row'
              }`}>
                <span className="font-medium">{message.sender.name}</span>
                <span className="text-gray-500 text-xs">
                  {format(message.timestamp, 'HH:mm', { locale: fr })}
                </span>
              </div>
              <div className={`group relative ${
                message.sender.id === currentUserId 
                  ? 'bg-purple-50 text-purple-900' 
                  : 'bg-gray-50 text-gray-900'
              } rounded-lg px-4 py-2`}>
                <div className="text-sm break-words">{message.content}</div>
                {message.sender.id === currentUserId && (
                  <button
                    onClick={() => onDeleteMessage(message.id)}
                    className="absolute -right-8 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Supprimer le message"
                  >
                    <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                  </button>
                )}
              </div>
              {message.attachments && message.attachments.map((attachment, index) => (
                <div key={index} className="relative group">
                  <MessageAttachment
                    url={attachment.url}
                    filename={attachment.filename}
                    locale="fr"
                  />
                  {message.sender.id === currentUserId && (
                    <button
                      onClick={() => onDeleteMessage(message.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      aria-label="Supprimer la pièce jointe"
                    >
                      <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};
