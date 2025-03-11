
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/messaging";

export const useMessageOptimization = (channelId: string) => {
  const {
    data: messages = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['messages', channelId],
    queryFn: async () => {
      const { data: messagesData, error: messagesError } = await supabase
        .from("chat_messages")
        .select("*")
        .eq('channel_id', channelId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      // Get channel type first
      const { data: channelData, error: channelError } = await supabase
        .from('chat_channels')
        .select('channel_type')
        .eq('id', channelId)
        .single();

      if (channelError) throw channelError;

      const formattedMessages = await Promise.all(
        (messagesData || []).map(async (message) => {
          const { data: senderData } = await supabase
            .rpc('get_message_sender_details', {
              sender_id: message.sender_id
            });

          const sender = senderData?.[0];
          return {
            id: message.id,
            content: message.content,
            sender: {
              id: sender.id,
              name: sender.name,
              avatarUrl: sender.avatar_url || ''
            },
            timestamp: new Date(message.created_at),
            channelType: channelData.channel_type as "group" | "direct"
          } satisfies Message;
        })
      );

      return formattedMessages;
    },
    staleTime: 30000, // Cache data for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep unused data in cache for 5 minutes (formerly cacheTime)
  });

  return {
    messages,
    isLoading,
    error
  };
};
