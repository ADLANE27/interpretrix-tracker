import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  channel_id: string;
  sender: {
    email: string;
    raw_user_meta_data: {
      first_name: string;
      last_name: string;
    };
  };
  mentions: {
    id: string;
    mentioned_user_id: string;
    mentioned_user: {
      email: string;
      raw_user_meta_data: {
        first_name: string;
        last_name: string;
      };
    };
  }[];
}

interface MessageListProps {
  channelId: string;
}

interface PresenceState {
  [key: string]: {
    online_at: string;
    user_id: string;
  }[];
}

export const MessageList = ({ channelId }: MessageListProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [presenceState, setPresenceState] = useState<PresenceState>({});

  const { data: channelMessages, isError } = useQuery({
    queryKey: ["messages", channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:sender_id (
            email,
            raw_user_meta_data
          ),
          mentions:message_mentions (
            id,
            mentioned_user_id,
            mentioned_user:mentioned_user_id (
              email,
              raw_user_meta_data
            )
          )
        `)
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        toast({
          title: "Error",
          description: "Failed to load messages",
          variant: "destructive",
        });
        throw error;
      }

      return data as Message[];
    },
    enabled: !!channelId,
  });

  useEffect(() => {
    if (channelMessages) {
      setMessages(channelMessages);
    }
  }, [channelMessages]);

  useEffect(() => {
    // Set up real-time presence tracking
    const channel = supabase.channel(`presence:${channelId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setPresenceState(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('join', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('leave', key, leftPresences);
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

    // Set up real-time message updates
    const messageChannel = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const { data, error } = await supabase
              .from("messages")
              .select(`
                *,
                sender:sender_id (
                  email,
                  raw_user_meta_data
                ),
                mentions:message_mentions (
                  id,
                  mentioned_user_id,
                  mentioned_user:mentioned_user_id (
                    email,
                    raw_user_meta_data
                  )
                )
              `)
              .eq("id", payload.new.id)
              .single();

            if (!error && data) {
              setMessages((prev) => [...prev, data as Message]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(messageChannel);
    };
  }, [channelId]);

  const formatMessage = (content: string) => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    return content.replace(mentionRegex, (match, name) => (
      `@${name}`
    ));
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