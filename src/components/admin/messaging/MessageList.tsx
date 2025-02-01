import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  parent_id: string | null;
  sender?: {
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

  const { data: channelMessages } = useQuery({
    queryKey: ["messages", channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:interpreter_profiles!messages_sender_id_fkey (
            first_name,
            last_name,
            profile_picture_url
          )
        `)
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });

      if (error) {
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
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  return (
    <ScrollArea className="h-[500px] p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              {message.sender?.profile_picture_url && (
                <img
                  src={message.sender.profile_picture_url}
                  alt={`${message.sender.first_name} ${message.sender.last_name}`}
                />
              )}
            </Avatar>
            <div>
              <div className="font-semibold">
                {message.sender?.first_name} {message.sender?.last_name}
              </div>
              <div className="text-sm text-gray-600">{message.content}</div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};