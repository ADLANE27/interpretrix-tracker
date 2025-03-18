
import { useState, useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Message, Attachment, isAttachment } from '@/types/messaging';
import { useMessageActions } from './chat/useMessageActions';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const useChat = (channelId: string) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // Fetch current user once
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Fetch messages using the stored procedure
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['channel-messages', channelId],
    queryFn: async () => {
      if (!channelId) return [];
      
      console.log('[Chat] Fetching messages for channel:', channelId);
      
      try {
        // Using the stored procedure for efficient fetching
        const { data, error } = await supabase
          .rpc('get_channel_messages_with_senders', {
            p_channel_id: channelId
          });

        if (error) throw error;
        
        if (!Array.isArray(data)) return [];
        
        // Transform the data into Message objects
        const formattedMessages: Message[] = data.map(msg => {
          const parsedReactions = typeof msg.reactions === 'string' 
            ? JSON.parse(msg.reactions || '{}') 
            : (msg.reactions || {});
            
          const parsedAttachments: Attachment[] = [];
          if (Array.isArray(msg.attachments)) {
            msg.attachments.forEach(att => {
              if (typeof att === 'object' && att !== null) {
                const attachment = {
                  url: String(att['url'] || ''),
                  filename: String(att['filename'] || ''),
                  type: String(att['type'] || ''),
                  size: Number(att['size'] || 0)
                };
                if (isAttachment(attachment)) {
                  parsedAttachments.push(attachment);
                }
              }
            });
          }

          return {
            id: msg.id,
            content: msg.content,
            sender: {
              id: msg.sender_id,
              name: msg.sender_name,
              avatarUrl: msg.sender_avatar || ''
            },
            timestamp: new Date(msg.created_at),
            reactions: parsedReactions,
            attachments: parsedAttachments,
            channelType: msg.channel_type as 'group' | 'direct',
            parent_message_id: msg.parent_message_id
          };
        });
        
        return formattedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      } catch (error) {
        console.error('[Chat] Error fetching messages:', error);
        return [];
      }
    },
    staleTime: 1 * 60 * 1000, // Keep data fresh for 1 minute
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Set up real-time subscription - simplified
  useEffect(() => {
    if (!channelId) return;
    
    console.log('[Chat] Setting up realtime subscription for channel:', channelId);
    
    const channel = supabase.channel(`public:chat_messages:channel_id=eq.${channelId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`
      }, (payload) => {
        console.log('[Chat] Realtime update received:', payload);
        // Invalidate only after a small delay to prevent multiple unnecessary fetches
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['channel-messages', channelId] });
        }, 300);
      })
      .subscribe();
    
    return () => {
      console.log('[Chat] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  // Get message actions with optimistic updates
  const { 
    sendMessage, 
    deleteMessage, 
    reactToMessage,
    markMentionsAsRead
  } = useMessageActions(
    channelId, 
    currentUserId, 
    () => queryClient.invalidateQueries({ queryKey: ['channel-messages', channelId] })
  );

  return {
    messages: messages || [],
    isLoading,
    sendMessage,
    deleteMessage,
    currentUserId,
    reactToMessage,
    markMentionsAsRead,
  };
};
