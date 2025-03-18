
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
        // Using a direct SQL query to fetch messages
        const { data: messagesWithSenders, error } = await supabase
          .from('chat_messages')
          .select(`
            id,
            content,
            created_at,
            channel_id,
            sender_id,
            parent_message_id,
            reactions,
            attachments,
            chat_channels(channel_type)
          `)
          .eq('channel_id', channelId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        // Reset message cache on fresh fetch
        messageCache.current.clear();
        
        // Process and format the messages
        if (!Array.isArray(messagesWithSenders)) return [];
        
        const formattedMessages: Message[] = [];
        
        for (const msg of messagesWithSenders) {
          // Skip if already in cache
          if (messageCache.current.has(msg.id)) continue;
          
          // Add to cache
          messageCache.current.add(msg.id);
          
          // Get sender details
          const { data: senderData, error: senderError } = await supabase
            .rpc('get_message_sender_details', { sender_id: msg.sender_id });
            
          if (senderError) {
            console.error('[Chat] Error fetching sender details:', senderError);
            continue;
          }
          
          const sender = Array.isArray(senderData) && senderData.length > 0 
            ? senderData[0] 
            : { id: msg.sender_id, name: 'Unknown User', avatar_url: '' };
          
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

          formattedMessages.push({
            id: msg.id,
            content: msg.content,
            sender: {
              id: sender.id,
              name: sender.name,
              avatarUrl: sender.avatar_url
            },
            timestamp: new Date(msg.created_at),
            reactions: parsedReactions,
            attachments: parsedAttachments,
            channelType: msg.chat_channels?.channel_type as 'group' | 'direct',
            parent_message_id: msg.parent_message_id
          });
        }
        
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
