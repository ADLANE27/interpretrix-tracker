
import React, { useState } from 'react';
import { Message } from "@/types/messaging";
import { MessageItem } from './MessageItem';
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from 'lucide-react';

interface MessageThreadProps {
  rootMessage: Message;
  replies: Message[];
  currentUserId: string | null;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onReactToMessage: (messageId: string, emoji: string) => Promise<void>;
  setReplyTo?: (message: Message | null) => void;
  channelId: string;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  rootMessage,
  replies,
  currentUserId,
  onDeleteMessage,
  onReactToMessage,
  setReplyTo,
  channelId,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const toggleThread = () => {
    setIsExpanded(prev => !prev);
  };

  // Only render the thread UI if there are actually replies
  if (replies.length === 0) {
    return (
      <MessageItem
        message={rootMessage}
        currentUserId={currentUserId}
        onDeleteMessage={onDeleteMessage}
        onReactToMessage={onReactToMessage}
        setReplyTo={setReplyTo}
        channelId={channelId}
      />
    );
  }

  return (
    <div>
      <MessageItem
        message={rootMessage}
        currentUserId={currentUserId}
        onDeleteMessage={onDeleteMessage}
        onReactToMessage={onReactToMessage}
        setReplyTo={setReplyTo}
        channelId={channelId}
      />
      
      <div className="ml-12 mt-2 mb-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleThread}
          className="text-xs text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1.5 h-auto"
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 mr-1.5" />
          )}
          {replies.length} réponses
        </Button>
        
        {isExpanded && (
          <div className="space-y-2 mt-3 pl-3 border-l-2 border-gray-200">
            {replies.map(reply => (
              <MessageItem 
                key={reply.id}
                message={reply}
                currentUserId={currentUserId}
                onDeleteMessage={onDeleteMessage}
                onReactToMessage={onReactToMessage}
                setReplyTo={setReplyTo}
                isThreadReply={true}
                channelId={channelId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
