
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { Message } from '@/types/messaging';

interface ChatThreadProps {
  rootMessage: Message;
  replies: Message[];
  currentUserId: string | null;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onReplyToMessage: (message: Message) => void;
  dark?: boolean;
}

export const ChatThread: React.FC<ChatThreadProps> = ({
  rootMessage,
  replies,
  currentUserId,
  onDeleteMessage,
  onReplyToMessage,
  dark = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasReplies = replies.length > 0;
  const isCurrentUser = rootMessage.sender.id === currentUserId;

  return (
    <div className="mb-6">
      <ChatMessage
        message={rootMessage}
        isCurrentUser={isCurrentUser}
        onDelete={() => onDeleteMessage(rootMessage.id)}
        onReply={() => onReplyToMessage(rootMessage)}
        dark={dark}
      />
      
      {hasReplies && (
        <div className="ml-12 mt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1 h-auto"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 mr-1" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 mr-1" />
            )}
            {replies.length} {replies.length === 1 ? 'réponse' : 'réponses'}
          </Button>
          
          {isExpanded && (
            <div className="space-y-2 mt-2 pl-4 border-l-2 border-gray-200">
              {replies.map(reply => {
                const isReplyFromCurrentUser = reply.sender.id === currentUserId;
                return (
                  <ChatMessage 
                    key={reply.id}
                    message={reply} 
                    isCurrentUser={isReplyFromCurrentUser}
                    onDelete={() => onDeleteMessage(reply.id)}
                    isThreadReply={true}
                    dark={dark}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
