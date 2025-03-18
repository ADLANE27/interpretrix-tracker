
import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from 'lucide-react';
import { MessageItem } from './MessageItem';

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

interface MessageThreadProps {
  rootMessage: Message;
  replies: Message[];
  isThreadExpanded: boolean;
  currentUserId: any;
  onToggleThread: (messageId: string) => void;
  onDeleteMessage: (messageId: string, senderId: string) => void;
  onReplyToMessage: (message: Message) => void;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  rootMessage,
  replies,
  isThreadExpanded,
  currentUserId,
  onToggleThread,
  onDeleteMessage,
  onReplyToMessage,
}) => {
  const hasReplies = replies.length > 0;

  return (
    <>
      <MessageItem 
        message={rootMessage} 
        currentUserId={currentUserId}
        onDelete={onDeleteMessage}
        onReply={onReplyToMessage}
      />
      
      {hasReplies && (
        <div className="ml-12 mt-1 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleThread(rootMessage.id)}
            className="text-xs text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1 h-auto"
          >
            {isThreadExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 mr-1" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 mr-1" />
            )}
            {replies.length} réponses
          </Button>
          
          {isThreadExpanded && (
            <div className="space-y-2 mt-2 pl-4 border-l-2 border-gray-200">
              {replies.map(reply => (
                <MessageItem 
                  key={reply.id}
                  message={reply} 
                  currentUserId={currentUserId}
                  onDelete={onDeleteMessage}
                  onReply={() => {}} // No need to reply to replies
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};
