
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Message, MessageData } from "@/types/messaging";
import { useMessageFormatter } from "./useMessageFormatter";

export const useMessageOptimization = (channelId: string) => {
  const { formatMessage } = useMessageFormatter();

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

      const formattedMessages = await Promise.all(
        (messagesData || []).map(async (message) => {
          const messageData: MessageData = {
            id: message.id,
            content: message.content,
            sender_id: message.sender_id,
            channel_id: channelId,
            created_at: message.created_at,
            reactions: message.reactions || {},
            attachments: message.attachments || [],
            parent_message_id: message.parent_message_id
          };

          const formattedMessage = await formatMessage(messageData);
          if (!formattedMessage) {
            console.error('Failed to format message:', message);
            return null;
          }
          return formattedMessage;
        })
      );

      return formattedMessages.filter((msg): msg is Message => msg !== null);
    },
    staleTime: 30000, // Cache data for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep unused data in cache for 5 minutes
  });

  return {
    messages,
    isLoading,
    error
  };
};
