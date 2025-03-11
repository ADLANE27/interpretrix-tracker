
import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/messaging';

export const useMessageOptimization = (channelId: string, currentUserId: string | null) => {
  const queryClient = useQueryClient();
  const senderDetailsCache = useRef<Map<string, { id: string; name: string; avatarUrl?: string }>>(
    new Map()
  );

  // Optimized message query with sender details
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['channel-messages', channelId],
    queryFn: async () => {
      const { data: messagesData, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:sender_id (
            id,
            first_name,
            last_name,
            profile_picture_url
          )
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (messagesData || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: {
          id: msg.sender.id,
          name: `${msg.sender.first_name} ${msg.sender.last_name}`,
          avatarUrl: msg.sender.profile_picture_url
        },
        timestamp: new Date(msg.created_at),
        channelType: 'group'
      }));
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Setup real-time subscription
  useEffect(() => {
    if (!channelId) return;

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
        () => {
          queryClient.invalidateQueries({ queryKey: ['channel-messages', channelId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  return {
    messages,
    isLoading,
  };
};
