
import React, { useState } from 'react';
import { Message } from "@/types/messaging";
import { MessageAttachment } from './MessageAttachment';
import { Trash2, MessageCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Avatar } from "@/components/ui/avatar";
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { useMessageVisibility } from '@/hooks/useMessageVisibility';
import { groupMessages, MessageGroup } from '@/utils/messageGrouping';
import { MessageTimestamp } from './MessageTimestamp';

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onReactToMessage: (messageId: string, emoji: string) => Promise<void>;
  replyTo?: Message | null;
  setReplyTo?: (message: Message | null) => void;
  channelId: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onDeleteMessage,
  onReactToMessage,
  replyTo,
  setReplyTo,
  channelId,
}) => {
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(new Set());
  const { observeMessage } = useMessageVisibility(channelId);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDateDisplay = (date: Date) => {
    if (isToday(date)) {
      return "Aujourd'hui";
    } else if (isYesterday(date)) {
      return "Hier";
    }
    return format(date, 'EEEE d MMMM yyyy', { locale: fr });
  };

  const handleDeleteMessage = async (messageId: string) => {
    setDeletedMessageIds(prev => new Set([...prev, messageId]));
    try {
      await onDeleteMessage(messageId);
    } catch (error) {
      setDeletedMessageIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
      console.error('Failed to delete message:', error);
    }
  };

  const toggleThread = (messageId: string) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const visibleMessages = messages.filter(message => !deletedMessageIds.has(message.id));
  const messageGroups = groupMessages(visibleMessages);

  const renderMessageGroup = (group: MessageGroup) => {
    const { messages, sender } = group;
    const firstMessage = messages[0];

    return (
      <div 
        key={firstMessage.id}
        className="hover:bg-gray-50/50 px-4 py-2 transition-colors group"
      >
        <div className="flex gap-2">
          <div className="flex-shrink-0 mt-1">
            <Avatar className="h-10 w-10 ring-2 ring-purple-200">
              {sender.avatarUrl ? (
                <img 
                  src={sender.avatarUrl} 
                  alt={sender.name}
                  className="h-full w-full object-cover rounded-full"
                />
              ) : (
                <div className="bg-purple-100 text-purple-600 w-full h-full flex items-center justify-center text-sm font-medium rounded-full">
                  {getInitials(sender.name)}
                </div>
              )}
            </Avatar>
          </div>
          
          <div className="flex-1 min-w-0 max-w-[85%]">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-semibold text-[0.95rem] text-purple-900">
                {sender.name}
              </span>
              <MessageTimestamp date={firstMessage.timestamp} />
            </div>
            
            <div className="space-y-1">
              {messages.map((message, idx) => (
                <div key={message.id} className="group/message relative">
                  <div className="text-sm break-words text-gray-900">
                    {message.content}
                  </div>

                  {message.attachments?.map((attachment, attachmentIdx) => (
                    <div key={attachmentIdx} className="mt-2 relative group/attachment">
                      <MessageAttachment
                        url={attachment.url}
                        filename={attachment.filename}
                        locale="fr"
                      />
                    </div>
                  ))}

                  <div className="absolute right-0 top-0 opacity-0 group-hover/message:opacity-100 transition-opacity flex items-center gap-1">
                    {message.sender.id === currentUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMessage(message.id)}
                        className="h-7 w-7 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                      </Button>
                    )}
                    {!message.parent_message_id && setReplyTo && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplyTo(message)}
                        className="h-7 w-7 p-0"
                      >
                        <MessageCircle className="h-4 w-4 text-gray-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {messages[0].id && messages.length > 0 && (
          <div className="mt-1 ml-12">
            {messages[0].parent_message_id && expandedThreads.has(messages[0].parent_message_id) && (
              <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                {/* Thread replies would go here */}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {messageGroups.map((group, index) => {
        const showDate = index === 0 || 
          formatDateDisplay(group.date) !== formatDateDisplay(messageGroups[index - 1].date);

        return (
          <React.Fragment key={group.messages[0].id}>
            {showDate && (
              <div className="flex justify-center my-4">
                <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                  {formatDateDisplay(group.date)}
                </div>
              </div>
            )}
            {renderMessageGroup(group)}
          </React.Fragment>
        );
      })}
    </div>
  );
};

