import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
}

export const ChatMessage = ({ content, sender, timestamp, isCurrentUser }: ChatMessageProps) => {
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
          "rounded-lg px-4 py-2",
          isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          <p className="text-sm">{content}</p>
        </div>
        <span className="text-xs text-muted-foreground mt-1">
          {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};