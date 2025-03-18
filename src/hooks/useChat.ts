
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Message, MessageData, Attachment, isAttachment } from '@/types/messaging';
import { useMessageFormatter } from './chat/useMessageFormatter';
import { useMessageActions } from './chat/useMessageActions';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const useChat = (channelId: string) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messageCache = useRef<Set<string>>(new Set());
  const queryClient = useQueryClient();
  
  // Fetch current user once
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Fetch messages with a single query and efficient caching
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['channel-messages', channelId],
    queryFn: async () => {
      if (!channelId) return [];
      
      console.log('[Chat] Fetching messages for channel:', channelId);
      
      try {
        // Using a direct SQL query with joins to fetch messages and sender details in one go
        const { data: messagesWithSenders, error } = await supabase
          .rpc('get_channel_messages_with_senders', { 
            p_channel_id: channelId 
          });
        
        if (error) throw error;
        
        // Reset message cache on fresh fetch
        messageCache.current.clear();
        
        // Process and format the messages
        const formattedMessages: Message[] = messagesWithSenders
          .filter(msg => !messageCache.current.has(msg.id))
          .map(msg => {
            // Add to cache
            messageCache.current.add(msg.id);
            
            let parsedReactions = {};
            try {
              if (typeof msg.reactions === 'string') {
                parsedReactions = JSON.parse(msg.reactions);
              } else if (msg.reactions && typeof msg.reactions === 'object') {
                parsedReactions = msg.reactions;
              }
            } catch (e) {
              console.error('[Chat] Error parsing reactions:', e);
            }

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
                name: msg.sender_name || 'Unknown User',
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
    staleTime: 5 * 60 * 1000, // Keep data fresh for 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Set up real-time subscription
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
        // Immediately invalidate the query to trigger a refresh
        queryClient.invalidateQueries({ queryKey: ['channel-messages', channelId] });
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
    isSubscribed: true, // Always return true to avoid loading state
    subscriptionStatus: { messages: true, mentions: true }, // Always return true
    sendMessage,
    deleteMessage,
    currentUserId,
    reactToMessage,
    markMentionsAsRead,
  };
};
