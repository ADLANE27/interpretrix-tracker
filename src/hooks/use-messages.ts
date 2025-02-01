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
          sender:interpreter_profiles!messages_sender_id_fkey (
            id,
            email,
            first_name,
            last_name
          )
        `)
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      const messagesWithMentions = await Promise.all(
        messagesData.map(async (message) => {
          const { data: mentions, error: mentionsError } = await supabase
            .from("message_mentions")
            .select(`
              id,
              mentioned_user_id,
              mentioned_user:interpreter_profiles!message_mentions_mentioned_user_id_fkey (
                id,
                email,
                first_name,
                last_name
              )
            `)
            .eq("message_id", message.id);

          if (mentionsError) throw mentionsError;

          return {
            ...message,
            sender: {
              id: message.sender.id,
              email: message.sender.email,
              raw_user_meta_data: {
                first_name: message.sender.first_name,
                last_name: message.sender.last_name
              }
            },
            mentions: mentions.map(mention => ({
              ...mention,
              mentioned_user: {
                id: mention.mentioned_user.id,
                email: mention.mentioned_user.email,
                raw_user_meta_data: {
                  first_name: mention.mentioned_user.first_name,
                  last_name: mention.mentioned_user.last_name
                }
              }
            }))
          };
        })
      );

      return messagesWithMentions as Message[];
    },
    enabled: !!channelId,
  });
};