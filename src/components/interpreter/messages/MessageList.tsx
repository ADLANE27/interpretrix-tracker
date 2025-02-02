import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  mentions?: { mentioned_user_id: string }[];
}

interface SenderProfile {
  first_name: string;
  last_name: string;
  id: string;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  senderProfiles: Record<string, SenderProfile>;
  onDeleteMessage: (messageId: string) => void;
}

export const MessageList = ({
  messages,
  currentUserId,
  senderProfiles,
  onDeleteMessage,
}: MessageListProps) => {
  const getSenderName = (senderId: string): string => {
    const profile = senderProfiles[senderId];
    if (!profile) return "Loading...";
    return `${profile.first_name} ${profile.last_name}`.trim();
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleMessagesRead = async () => {
      if (!currentUserId) return;
      
      const messageIds = messages
        .filter(msg => msg.mentions?.some(mention => mention.mentioned_user_id === currentUserId))
        .map(msg => msg.id);

      if (messageIds.length > 0) {
        try {
          const updates = messageIds.map(messageId => ({
            message_id: messageId,
            mentioned_user_id: currentUserId,
            read_at: new Date().toISOString()
          }));

          const { error } = await supabase
            .from('message_mentions')
            .upsert(updates, {
              onConflict: 'message_id,mentioned_user_id'
            });

          if (error) {
            console.error('[MessageList] Error marking mentions as read:', error);
          }

          // Trigger a refresh of unread mentions count in parent components
          const event = new CustomEvent('mentionsRead');
          window.dispatchEvent(event);
        } catch (error) {
          console.error('[MessageList] Error in handleMessagesRead:', error);
        }
      }
    };

    handleMessagesRead();
  }, [messages, currentUserId]);

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((message) => {
          const isCurrentUser = message.sender_id === currentUserId;
          const senderName = getSenderName(message.sender_id);

          return (
            <div
              key={message.id}
              className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className="group relative max-w-[70%]">
                {!isCurrentUser && (
                  <div className="text-sm font-medium text-gray-700 mb-1 px-1">
                    {senderName}
                  </div>
                )}
                <div
                  className={`rounded-lg p-3 ${
                    isCurrentUser
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
                {isCurrentUser && (
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
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};