
import React, { useState } from 'react';
import { Message, Attachment } from "@/types/messaging";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageAttachment } from "./MessageAttachment";
import { format } from 'date-fns';
import { Avatar } from "@/components/ui/avatar";
import { Trash2, Reply, ThumbsUp, Heart, Laugh } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  onReactToMessage?: (messageId: string, emoji: string) => Promise<void>;
  replyTo?: Message | null;
  setReplyTo?: (message: Message | null) => void;
  channelId?: string;
}

export const UnifiedMessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onDeleteMessage,
  onReactToMessage,
  replyTo,
  setReplyTo,
  channelId,
}) => {
  const [showReactionPopover, setShowReactionPopover] = useState<string | null>(null);

  const renderMessage = (message: Message, isParent = true) => {
    const isCurrentUser = message.sender.id === currentUserId;
    const hasReplies = messages.some(msg => msg.parent_message_id === message.id);
    const replyMessages = messages.filter(msg => msg.parent_message_id === message.id);
    
    // Calculate total reactions count
    const reactionCount = message.reactions 
      ? Object.values(message.reactions).reduce((acc, reactors) => acc + reactors.length, 0) 
      : 0;

    // Function to check if current user has reacted with specific emoji
    const hasUserReacted = (emoji: string) => {
      if (!message.reactions || !currentUserId) return false;
      return message.reactions[emoji]?.includes(currentUserId) || false;
    };

    return (
      <div 
        key={message.id} 
        className={cn(
          "p-4 rounded-lg mb-2",
          isCurrentUser ? "ml-auto bg-primary text-primary-foreground max-w-[80%]" : "mr-auto bg-muted max-w-[80%]"
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <Avatar className="h-6 w-6">
            <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground text-xs font-medium">
              {message.sender.name.charAt(0).toUpperCase()}
            </div>
          </Avatar>
          <span className="font-semibold text-sm">{message.sender.name}</span>
          <span className="text-xs opacity-70">
            {format(message.timestamp, "HH:mm")}
          </span>
        </div>
        
        {message.parent_message_id && !isParent && (
          <div className="text-xs opacity-70 mb-1 italic">
            Replying to a message
          </div>
        )}
        
        <p className="whitespace-pre-wrap mb-2">{message.content}</p>

        {message.attachments && message.attachments.length > 0 && (
          <div className="space-y-2 my-2">
            {message.attachments.map((attachment, index) => (
              <MessageAttachment 
                key={index} 
                url={attachment.url}
                filename={attachment.filename}
                type={attachment.type}
                dark={isCurrentUser} 
              />
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-2 text-xs">
          {onReactToMessage && (
            <Popover 
              open={showReactionPopover === message.id} 
              onOpenChange={(open) => setShowReactionPopover(open ? message.id : null)}
            >
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "p-1 h-auto hover:bg-secondary hover:text-secondary-foreground",
                    isCurrentUser ? "text-primary-foreground" : ""
                  )}
                >
                  {reactionCount > 0 ? `${reactionCount} 👍` : "React"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-1 flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    onReactToMessage(message.id, "👍");
                    setShowReactionPopover(null);
                  }}
                  className={cn(
                    "p-1 h-auto", 
                    hasUserReacted("👍") ? "bg-secondary" : ""
                  )}
                >
                  <ThumbsUp size={14} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    onReactToMessage(message.id, "❤️");
                    setShowReactionPopover(null);
                  }}
                  className={cn(
                    "p-1 h-auto", 
                    hasUserReacted("❤️") ? "bg-secondary" : ""
                  )}
                >
                  <Heart size={14} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    onReactToMessage(message.id, "😂");
                    setShowReactionPopover(null);
                  }}
                  className={cn(
                    "p-1 h-auto", 
                    hasUserReacted("😂") ? "bg-secondary" : ""
                  )}
                >
                  <Laugh size={14} />
                </Button>
              </PopoverContent>
            </Popover>
          )}
          
          {setReplyTo && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setReplyTo(message)}
              className={cn(
                "p-1 h-auto hover:bg-secondary hover:text-secondary-foreground",
                isCurrentUser ? "text-primary-foreground" : ""
              )}
            >
              <Reply size={14} className="mr-1" />
              Reply
            </Button>
          )}

          {onDeleteMessage && isCurrentUser && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDeleteMessage(message.id)}
              className={cn(
                "p-1 h-auto hover:bg-secondary hover:text-secondary-foreground ml-auto",
                isCurrentUser ? "text-primary-foreground" : ""
              )}
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>

        {hasReplies && isParent && (
          <div className="mt-2 pl-4 border-l-2 border-gray-300 space-y-2">
            {replyMessages.map(reply => renderMessage(reply, false))}
          </div>
        )}
      </div>
    );
  };

  // Group messages by day
  const messagesByDay: { [key: string]: Message[] } = {};
  messages.forEach(message => {
    const day = format(message.timestamp, "yyyy-MM-dd");
    if (!messagesByDay[day]) {
      messagesByDay[day] = [];
    }
    messagesByDay[day].push(message);
  });

  return (
    <div className="p-4 space-y-4">
      {Object.entries(messagesByDay).map(([day, dayMessages]) => (
        <div key={day}>
          <div className="flex items-center gap-2 my-4">
            <div className="h-px flex-1 bg-gray-200"></div>
            <span className="text-xs text-gray-500 font-medium">
              {format(new Date(day), "EEEE, MMMM d")}
            </span>
            <div className="h-px flex-1 bg-gray-200"></div>
          </div>
          
          <div className="space-y-4">
            {dayMessages
              .filter(message => !message.parent_message_id)
              .map(message => renderMessage(message))}
          </div>
        </div>
      ))}
      
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-32 text-gray-500">
          No messages yet
        </div>
      )}
    </div>
  );
};
