import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Message } from "@/types/messaging";

export const useMessages = (channelId: string) => {
  return useQuery({
    queryKey: ["messages", channelId],
    queryFn: async () => {
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select(`
          *,
          sender:sender_id (
            id,
            email,
            first_name,
            last_name
          ),
          mentions:message_mentions (
            id,
            mentioned_user:mentioned_user_id (
              id,
              email,
              first_name,
              last_name
            )
          )
        `)
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      const formattedMessages = messagesData.map(message => ({
        ...message,
        sender: {
          id: message.sender?.id || "",
          email: message.sender?.email || "",
          raw_user_meta_data: {
            first_name: message.sender?.first_name || "",
            last_name: message.sender?.last_name || ""
          }
        },
        mentions: (message.mentions || []).map(mention => ({
          id: mention.id,
          mentioned_user_id: mention.mentioned_user?.id || "",
          mentioned_user: {
            id: mention.mentioned_user?.id || "",
            email: mention.mentioned_user?.email || "",
            raw_user_meta_data: {
              first_name: mention.mentioned_user?.first_name || "",
              last_name: mention.mentioned_user?.last_name || ""
            }
          }
        }))
      }));

      return formattedMessages as Message[];
    },
    enabled: !!channelId,
  });
};