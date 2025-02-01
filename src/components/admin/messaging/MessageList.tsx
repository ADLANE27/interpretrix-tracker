import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMessages } from "@/hooks/use-messages";
import type { Message, PresenceState } from "@/types/messaging";

interface MessageListProps {
  channelId: string;
}

export const MessageList = ({ channelId }: MessageListProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [presenceState, setPresenceState] = useState<PresenceState>({});
  
  const { data: channelMessages, isError } = useMessages(channelId);

  useEffect(() => {
    if (channelMessages) {
      setMessages(channelMessages);
    }
  }, [channelMessages]);

  useEffect(() => {
    const channel = supabase.channel(`presence:${channelId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ user_id: string; online_at: string }>();
        setPresenceState(state as PresenceState);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await channel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
            });
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  const formatMessage = (content: string) => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    return content.replace(mentionRegex, (match, name) => `@${name}`);
  };

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Failed to load messages</AlertDescription>
      </Alert>
    );
  }

  return (
    <ScrollArea className="h-[500px] p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {message.sender.raw_user_meta_data.first_name} {message.sender.raw_user_meta_data.last_name}
                </span>
                {presenceState[message.sender_id]?.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1">
                    online
                  </Badge>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {formatMessage(message.content)}
              </div>
              {message.mentions && message.mentions.length > 0 && (
                <div className="mt-1 text-xs text-gray-400">
                  Mentioned: {message.mentions.map(mention => 
                    `${mention.mentioned_user.raw_user_meta_data.first_name} ${mention.mentioned_user.raw_user_meta_data.last_name}`
                  ).join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};