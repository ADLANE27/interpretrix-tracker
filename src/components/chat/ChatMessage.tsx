import { Trash2, MessageCircleReply, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
}

export const ChatMessage = ({ 
  content, 
  sender, 
  timestamp, 
  isCurrentUser,
  onDelete,
  onReply,
  isReply,
  parentSender
}: ChatMessageProps) => {
  return (
    <div className={cn(
      "flex gap-3 mb-4",
      isCurrentUser ? "flex-row-reverse" : "flex-row",
      isReply && "ml-8"
    )}>
      {isReply && (
        <div className="absolute left-2 flex items-center text-muted-foreground text-xs gap-1">
          <ChevronRight className="h-3 w-3" />
          <span>Reply to {parentSender?.name}</span>
        </div>
      )}
      <Avatar className="h-8 w-8">
        {sender.avatarUrl && <AvatarImage src={sender.avatarUrl} alt={sender.name} />}
        <AvatarFallback>{sender.name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className={cn(
        "flex flex-col max-w-[70%]",
        isCurrentUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "rounded-lg px-4 py-2 group relative",
          isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          <p className="text-sm">{content}</p>
          <div className="absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            {isCurrentUser && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute top-1/2 -translate-y-1/2",
                  isCurrentUser ? "-right-8" : "-left-8"
                )}
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {onReply && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute top-1/2 -translate-y-1/2",
                  isCurrentUser ? 
                    onDelete ? "-right-16" : "-right-8" : 
                    "-left-8"
                )}
                onClick={onReply}
              >
                <MessageCircleReply className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <span className="text-xs text-muted-foreground mt-1">
          {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};