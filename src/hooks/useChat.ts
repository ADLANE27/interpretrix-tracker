
import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Message, MessageData, Attachment, isAttachment } from '@/types/messaging';
import { useMessageFormatter } from './chat/useMessageFormatter';
import { useSubscriptions } from './chat/useSubscriptions';
import { useMessageActions } from './chat/useMessageActions';
import { CONNECTION_CONSTANTS } from '@/hooks/supabase-connection/constants';

// Add the type guard function at the top of the file
const isValidChannelType = (type: string): type is 'group' | 'direct' => {
  return type === 'group' || type === 'direct';
};

export const useChat = (channelId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    messages: boolean;
    mentions: boolean;
  }>({ messages: false, mentions: false });

  const { formatMessage } = useMessageFormatter();
  
  // Set default page size
  const PAGE_SIZE = CONNECTION_CONSTANTS.MESSAGE_FETCH_LIMIT || 30;

  const fetchMessages = useCallback(async (fromScratch = true) => {
    if (!channelId) return;
    
    if (fromScratch) {
      setIsLoading(true);
      setMessages([]);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      console.log('[Chat] Fetching messages for channel:', channelId, fromScratch ? 'initial load' : 'loading more');
      
      // First get the channel type to check if it's a direct message
      const { data: channelData, error: channelError } = await supabase
        .from('chat_channels')
        .select('channel_type, created_by')
        .eq('id', channelId)
        .single();

      if (channelError) throw channelError;

      if (!channelData?.channel_type || !isValidChannelType(channelData.channel_type)) {
        throw new Error('Invalid channel type');
      }

      const channelType = channelData.channel_type as 'group' | 'direct';
      
      // Calculate from and to for pagination
      // If loading more messages, we need to get a reference point
      const currentOldestMessageTime = messages.length > 0 && !fromScratch
        ? messages[0]?.timestamp
        : null;

      // Modified query to use pagination, ordering by created_at in descending order to get most recent first
      const messagesQuery = supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
        
      // If loading more (not fresh), use the oldest message as a cursor
      if (currentOldestMessageTime && !fromScratch) {
        messagesQuery.lt('created_at', currentOldestMessageTime.toISOString());
      }
      
      const { data: messagesData, error: messagesError } = await messagesQuery;

      if (messagesError) {
        console.error('[Chat] Error fetching messages:', messagesError);
        throw messagesError;
      }

      console.log('[Chat] Retrieved messages:', messagesData?.length);
      
      // If we got fewer messages than the page size, we've reached the end
      if (messagesData && messagesData.length < PAGE_SIZE) {
        setHasMoreMessages(false);
      }

      if (!messagesData || messagesData.length === 0) {
        if (fromScratch) setMessages([]);
        return;
      }

      // Get unique sender IDs to batch fetch user details
      const senderIds = Array.from(new Set(messagesData.map(msg => msg.sender_id)));
      
      // Batch fetch sender details
      const { data: sendersData, error: sendersError } = await supabase
        .rpc('batch_get_message_sender_details', {
          p_sender_ids: senderIds
        });
      
      if (sendersError) {
        console.error('[Chat] Error fetching batch sender details:', sendersError);
        throw sendersError;
      }
      
      // Create a map for quick lookup
      const sendersMap = new Map();
      if (sendersData) {
        sendersData.forEach(sender => {
          sendersMap.set(sender.id, {
            id: sender.id,
            name: sender.name,
            avatarUrl: sender.avatar_url || ''
          });
        });
      }

      const formattedMessages = messagesData.map(message => {
        try {
          const sender = sendersMap.get(message.sender_id);
          
          if (!sender) {
            console.error('[Chat] Sender not found:', message.sender_id);
            return null;
          }

          let parsedReactions = {};
          try {
            if (typeof message.reactions === 'string') {
              parsedReactions = JSON.parse(message.reactions);
            } else if (message.reactions && typeof message.reactions === 'object') {
              parsedReactions = message.reactions;
            }
          } catch (e) {
            console.error('[Chat] Error parsing reactions:', e);
          }

          const parsedAttachments: Attachment[] = [];
          if (Array.isArray(message.attachments)) {
            message.attachments.forEach(att => {
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
            id: message.id,
            content: message.content,
            sender: {
              id: sender.id,
              name: sender.name,
              avatarUrl: sender.avatarUrl
            },
            timestamp: new Date(message.created_at),
            parent_message_id: message.parent_message_id,
            reactions: parsedReactions,
            attachments: parsedAttachments,
            channelType: channelType
          } as Message;
        } catch (error) {
          console.error('[Chat] Error formatting message:', error, message);
          return null;
        }
      }).filter(Boolean) as Message[];

      if (fromScratch) {
        setMessages(formattedMessages);
      } else {
        // Append older messages at the beginning
        setMessages(prev => [...formattedMessages, ...prev]);
      }
    } catch (error) {
      console.error('[Chat] Error fetching messages:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [channelId, messages, PAGE_SIZE]);

  const loadMoreMessages = useCallback(() => {
    if (!isLoadingMore && hasMoreMessages) {
      fetchMessages(false);
    }
  }, [fetchMessages, isLoadingMore, hasMoreMessages]);

  const { 
    subscriptionStates, 
    handleSubscriptionError 
  } = useSubscriptions(
    channelId,
    currentUserId,
    retryCount,
    setRetryCount,
    () => fetchMessages(true) // Pass fetchMessages to ensure it's called when subscription receives updates
  );

  const { 
    sendMessage,
    deleteMessage: handleDeleteMessage,
    reactToMessage,
    markMentionsAsRead,
  } = useMessageActions(
    channelId,
    currentUserId,
    () => fetchMessages(true)
  );

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (channelId) {
      console.log('[Chat] Initial messages fetch for channel:', channelId);
      setHasMoreMessages(true);
      fetchMessages(true);
    }
  }, [channelId, fetchMessages]);

  useEffect(() => {
    setSubscriptionStatus({
      messages: subscriptionStates.messages?.status === 'SUBSCRIBED',
      mentions: subscriptionStates.mentions?.status === 'SUBSCRIBED'
    });
  }, [subscriptionStates]);

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMoreMessages,
    loadMoreMessages,
    isSubscribed: subscriptionStatus.messages && subscriptionStatus.mentions,
    subscriptionStatus,
    sendMessage,
    deleteMessage: handleDeleteMessage,
    currentUserId,
    reactToMessage,
    markMentionsAsRead,
  };
};
