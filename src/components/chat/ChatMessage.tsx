import { Trash2, MessageCircleReply, ChevronRight, Paperclip, FileText, Image as ImageIcon, ThumbsUp, ThumbsDown, Heart, Smile } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Attachment {
  url: string;
  filename: string;
  type: string;
  size: number;
}

interface ChatMessageProps {
  content: string;
  sender: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  timestamp: Date;
  isCurrentUser: boolean;
  onDelete?: () => void;
  onReply?: () => void;
  isReply?: boolean;
  parentSender?: {
    name: string;
  };
  attachments?: Attachment[];
  reactions?: Record<string, string[]>;
  onReact?: (emoji: string) => void;
  messageId: string; // Add this prop
  channelId: string; // Add this prop
}

const REACTIONS = [
  { emoji: '👍', icon: ThumbsUp },
  { emoji: '👎', icon: ThumbsDown },
  { emoji: '❤️', icon: Heart },
  { emoji: '😊', icon: Smile },
];

export const ChatMessage = ({ 
  content, 
  sender, 
  timestamp, 
  isCurrentUser,
  onDelete,
  onReply,
  isReply,
  parentSender,
  attachments = [],
  reactions = {},
  onReact,
  messageId,
  channelId
}: ChatMessageProps) => {
  useEffect(() => {
    const updateMentionStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if the current user is mentioned in this message
      const mentionRegex = new RegExp(`@${user.user_metadata.first_name} ${user.user_metadata.last_name}`);
      if (mentionRegex.test(content)) {
        // Update mention status to read when the message is viewed
        await supabase
          .from('message_mentions')
          .update({ status: 'read' })
          .eq('message_id', messageId)
          .eq('mentioned_user_id', user.id)
          .eq('channel_id', channelId);
      }
    };

    updateMentionStatus();
  }, [content, messageId, channelId]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className={cn(
      "flex gap-3 mb-4 group animate-fade-in",
      isCurrentUser ? "flex-row-reverse" : "flex-row",
      isReply && "ml-8"
    )}>
      {isReply && (
        <div className="absolute left-2 flex items-center text-muted-foreground text-xs gap-1">
          <ChevronRight className="h-3 w-3" />
          <span>Reply to {parentSender?.name}</span>
        </div>
      )}
      <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
        {sender.avatarUrl && <AvatarImage src={sender.avatarUrl} alt={sender.name} />}
        <AvatarFallback>{sender.name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className={cn(
        "flex flex-col max-w-[70%] gap-1",
        isCurrentUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "rounded-2xl px-4 py-2 group relative transition-all duration-200",
          isCurrentUser ? 
            "bg-gradient-to-br from-primary/90 to-primary text-primary-foreground shadow-md" : 
            "bg-gradient-to-br from-muted/80 to-muted/95 shadow-sm"
        )}>
          <p className="text-sm">{content}</p>
          {attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {attachments.map((attachment, index) => (
                <a
                  key={index}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-xl transition-colors duration-200",
                    isCurrentUser ? 
                      "bg-primary-foreground/10 hover:bg-primary-foreground/20" : 
                      "bg-background/50 hover:bg-background backdrop-blur-sm"
                  )}
                >
                  {getFileIcon(attachment.type)}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {attachment.filename}
                    </span>
                    <span className="text-xs opacity-70">
                      {formatFileSize(attachment.size)}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="flex items-center gap-1">
            {Object.entries(reactions).map(([emoji, users]) => (
              users.length > 0 && (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs hover:bg-muted/50 transition-colors duration-200"
                  onClick={() => onReact?.(emoji)}
                >
                  {emoji} {users.length}
                </Button>
              )
            ))}
            {isCurrentUser && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {onReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary transition-colors duration-200"
                onClick={onReply}
              >
                <MessageCircleReply className="h-4 w-4" />
              </Button>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 hover:bg-muted/50 transition-colors duration-200"
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="flex gap-1">
                  {REACTIONS.map(({ emoji, icon: Icon }) => (
                    <Button
                      key={emoji}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-muted/50 transition-colors duration-200"
                      onClick={() => onReact?.(emoji)}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
};
