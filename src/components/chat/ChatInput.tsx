import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, X, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (content: string, parentMessageId?: string) => void;
  isLoading?: boolean;
  replyTo?: {
    id: string;
    content: string;
    sender: {
      name: string;
    };
  };
  onCancelReply?: () => void;
}

export const ChatInput = ({ 
  onSendMessage, 
  isLoading = false,
  replyTo,
  onCancelReply
}: ChatInputProps) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim(), replyTo?.id);
      setMessage("");
    }
  };

  const handleFileSelect = () => {
    // This will be implemented in the next step
    console.log("File selection will be implemented in the next step");
  };

  return (
    <div className="border-t">
      {replyTo && (
        <div className="px-4 py-2 bg-muted/50 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">
              Replying to {replyTo.sender.name}
            </span>
            <span className="text-sm truncate">{replyTo.content}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancelReply}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2 p-4">
        <div className="flex-1 flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleFileSelect}
            className="flex-shrink-0"
          >
            <Paperclip className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Écrivez votre message..."
            className={cn(
              "min-h-[44px] max-h-[200px]",
              replyTo && "rounded-t-none"
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
        </div>
        <Button 
          type="submit" 
          disabled={!message.trim() || isLoading}
          className="px-4 flex-shrink-0"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};