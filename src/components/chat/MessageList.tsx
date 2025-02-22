
import React from 'react';
import { Message } from "@/types/messaging";
import { MessageAttachment } from './MessageAttachment';
import { Trash2 } from 'lucide-react';

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
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.sender.id === currentUserId ? 'justify-end' : 'justify-start'
          }`}
        >
          <div className="max-w-[70%]">
            <div className="flex items-start gap-2 group">
              {message.sender.id !== currentUserId && (
                <div className="font-medium text-sm">{message.sender.name}:</div>
              )}
              <div className="text-sm">{message.content}</div>
              {message.sender.id === currentUserId && (
                <button
                  onClick={() => onDeleteMessage(message.id)}
                  className="p-1 rounded-md hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Delete message"
                >
                  <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                </button>
              )}
            </div>
            {message.attachments && message.attachments.map((attachment, index) => (
              <MessageAttachment
                key={index}
                url={attachment.url}
                filename={attachment.filename}
                locale="fr"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
