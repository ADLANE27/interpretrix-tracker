
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/messaging";
import { useCallback, useEffect } from "react";

export const useMessageOptimization = (channelId: string) => {
  const queryClient = useQueryClient();
  
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
            channelType: 'group' as const
          };
        })
      );

      return formattedMessages;
    },
    staleTime: 30000, // Cache data for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep unused data in cache for 5 minutes
  });

  const subscribeToMessages = useCallback(() => {
    const channel = supabase
      .channel(`messages-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`
        },
        (payload) => {
          // Immediately update cache with new message
          if (payload.eventType === 'DELETE') {
            queryClient.setQueryData(['messages', channelId], (oldData: Message[] = []) => {
              return oldData.filter(msg => msg.id !== payload.old.id);
            });
            return;
          }

          // For inserts and updates, fetch sender details first, then update the cache
          supabase
            .rpc('get_message_sender_details', {
              sender_id: payload.new.sender_id
            })
            .then(({ data: senderData }) => {
              const sender = senderData?.[0];
              const newMessage = {
                id: payload.new.id,
                content: payload.new.content,
                sender: {
                  id: sender.id,
                  name: sender.name,
                  avatarUrl: sender.avatar_url || ''
                },
                timestamp: new Date(payload.new.created_at),
                channelType: 'group' as const
              };

              queryClient.setQueryData(['messages', channelId], (oldData: Message[] = []) => {
                if (payload.eventType === 'INSERT') {
                  return [...oldData, newMessage];
                }

                // Update
                return oldData.map(msg => 
                  msg.id === payload.new.id ? newMessage : msg
                );
              });
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  useEffect(() => {
    const unsubscribe = subscribeToMessages();
    return () => {
      unsubscribe();
    };
  }, [subscribeToMessages]);

  return {
    messages,
    isLoading,
    error
  };
};
