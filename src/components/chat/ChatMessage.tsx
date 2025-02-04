import { Trash2 } from 'lucide-react';
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
}

export const ChatMessage = ({ 
  content, 
  sender, 
  timestamp, 
  isCurrentUser,
  onDelete 
}: ChatMessageProps) => {
  return (
    <div className={cn(
      "flex gap-3 mb-4",
      isCurrentUser ? "flex-row-reverse" : "flex-row"
    )}>
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
          {isCurrentUser && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <span className="text-xs text-muted-foreground mt-1">
          {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};