import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, User } from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  parent_id: string | null;
  channel_id: string | null;
  recipient_id: string | null;
  updated_at: string;
  sender: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url: string | null;
  };
}

interface MessageListProps {
  channelId: string;
}

export const MessageList = ({ channelId }: MessageListProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);

  const { data: channelMessages, isError } = useQuery({
    queryKey: ["messages", channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:users (
            id,
            raw_user_meta_data->first_name,
            raw_user_meta_data->last_name,
            raw_user_meta_data->profile_picture_url
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

      return data.map((message) => ({
        ...message,
        sender: {
          id: message.sender?.id || "",
          first_name: message.sender?.raw_user_meta_data?.first_name || "",
          last_name: message.sender?.raw_user_meta_data?.last_name || "",
          profile_picture_url: message.sender?.raw_user_meta_data?.profile_picture_url || null,
        },
      })) as Message[];
    },
    enabled: !!channelId,
  });

  useEffect(() => {
    if (channelMessages) {
      setMessages(channelMessages);
    }
  }, [channelMessages]);

  useEffect(() => {
    const channel = supabase
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
                sender:users (
                  id,
                  raw_user_meta_data->first_name,
                  raw_user_meta_data->last_name,
                  raw_user_meta_data->profile_picture_url
                )
              `)
              .eq("id", payload.new.id)
              .single();

            if (!error && data) {
              const newMessage = {
                ...data,
                sender: {
                  id: data.sender?.id || "",
                  first_name: data.sender?.raw_user_meta_data?.first_name || "",
                  last_name: data.sender?.raw_user_meta_data?.last_name || "",
                  profile_picture_url: data.sender?.raw_user_meta_data?.profile_picture_url || null,
                },
              } as Message;

              setMessages((prev) => [...prev, newMessage]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

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
              {message.sender?.profile_picture_url ? (
                <AvatarImage
                  src={message.sender.profile_picture_url}
                  alt={`${message.sender.first_name} ${message.sender.last_name}`}
                />
              ) : (
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <div className="font-semibold">
                {message.sender
                  ? `${message.sender.first_name} ${message.sender.last_name}`
                  : "Unknown User"}
              </div>
              <div className="text-sm text-gray-600">{message.content}</div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
