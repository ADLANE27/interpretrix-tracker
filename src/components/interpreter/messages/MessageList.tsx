import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  senderProfiles: Record<string, { first_name: string; last_name: string }>;
  onDeleteMessage: (messageId: string) => void;
}

export const MessageList = ({
  messages,
  currentUserId,
  senderProfiles,
  onDeleteMessage,
}: MessageListProps) => {
  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
          >
            <div className="group relative max-w-[70%]">
              {message.sender_id !== currentUserId && senderProfiles[message.sender_id] && (
                <div className="text-sm font-medium text-gray-700 mb-1 px-1">
                  {senderProfiles[message.sender_id].first_name} {senderProfiles[message.sender_id].last_name}
                </div>
              )}
              <div
                className={`rounded-lg p-3 ${
                  message.sender_id === currentUserId
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary'
                }`}
              >
                {message.content}
                {message.attachment_url && (
                  <div className="mt-2">
                    <a 
                      href={message.attachment_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm underline"
                    >
                      {message.attachment_name || 'Attachment'}
                    </a>
                  </div>
                )}
                <div className="text-xs opacity-70 mt-1">
                  {new Date(message.created_at).toLocaleString()}
                </div>
              </div>
              {message.sender_id === currentUserId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onDeleteMessage(message.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};