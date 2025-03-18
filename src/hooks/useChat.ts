
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Message, Attachment, isAttachment, parseReactions } from '@/types/messaging';
import { useMessageActions } from './chat/useMessageActions';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSubscriptions } from './chat/useSubscriptions';

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

  // Fetch messages using a direct query since we can't use the stored procedure
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['channel-messages', channelId],
    queryFn: async () => {
      if (!channelId) return [];
      
      console.log('[Chat] Fetching messages for channel:', channelId);
      
      try {
        // Using a direct SQL query for efficient fetching
        const { data, error } = await supabase
          .from('chat_messages')
          .select(`
            id, 
            content, 
            created_at,
            sender_id,
            channel_id,
            parent_message_id,
            reactions,
            attachments
          `)
          .eq('channel_id', channelId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        if (!Array.isArray(data)) return [];
        
        // Get unique sender IDs for batch fetching
        const senderIds = [...new Set(data.map(msg => msg.sender_id))];
        
        // Batch fetch all sender details
        const { data: senders, error: sendersError } = await supabase
          .from('interpreter_profiles')
          .select('id, first_name, last_name, profile_picture_url')
          .in('id', senderIds);
          
        if (sendersError) {
          console.error('[Chat] Error fetching sender details:', sendersError);
        }

        // Create sender lookup map
        const senderMap: {[key: string]: {id: string, name: string, avatarUrl: string}} = {};
        if (senders) {
          senders.forEach(sender => {
            senderMap[sender.id] = {
              id: sender.id,
              name: `${sender.first_name} ${sender.last_name}`,
              avatarUrl: sender.profile_picture_url || ''
            };
          });
        }

        // For admin users not found in interpreter profiles, fetch from auth.users via function
        const missingIds = senderIds.filter(id => !senderMap[id]);
        if (missingIds.length > 0) {
          const { data: adminSenders, error: adminError } = await supabase
            .rpc('batch_get_message_sender_details', { p_sender_ids: missingIds });
            
          if (adminError) {
            console.error('[Chat] Error fetching admin details:', adminError);
          } else if (adminSenders) {
            adminSenders.forEach((sender: any) => {
              senderMap[sender.id] = {
                id: sender.id,
                name: sender.name,
                avatarUrl: sender.avatar_url || ''
              };
            });
          }
        }
        
        // Transform the data into Message objects
        const formattedMessages: Message[] = data.map(msg => {
          // Parse reactions with type safety
          const parsedReactions = parseReactions(msg.reactions);
            
          // Handle attachments with type safety
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

          // Use sender details from our map, or provide fallback
          const sender = senderMap[msg.sender_id] || {
            id: msg.sender_id,
            name: 'Unknown User',
            avatarUrl: ''
          };

          return {
            id: msg.id,
            content: msg.content,
            sender: sender,
            sender_id: msg.sender_id,
            channel_id: msg.channel_id,
            timestamp: new Date(msg.created_at),
            created_at: msg.created_at,
            reactions: parsedReactions,
            attachments: parsedAttachments,
            channelType: 'group',  // Default, will be updated if needed
            parent_message_id: msg.parent_message_id
          };
        });
        
        console.log(`[Chat] Formatted ${formattedMessages.length} messages`);
        return formattedMessages;
      } catch (error) {
        console.error('[Chat] Error fetching messages:', error);
        return [];
      }
    },
    staleTime: 10 * 1000, // Keep data fresh for 10 seconds to reduce excessive refetching
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Set up real-time subscription using our shared hook
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
        }, 100);
      })
      .subscribe();
    
    return () => {
      console.log('[Chat] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);
  
  // Add specialized subscription for mentions
  useSubscriptions(channelId, currentUserId, () => {
    queryClient.invalidateQueries({ queryKey: ['channel-messages', channelId] });
  });

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
