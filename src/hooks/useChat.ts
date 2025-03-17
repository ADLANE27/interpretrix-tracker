
import { useState, useEffect, useCallback, useRef } from 'react';
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
  }>({ messages: false });
  
  // Cache for sender details to avoid redundant fetches
  const senderCache = useRef<Map<string, { id: string; name: string; avatarUrl: string }>>(new Map());
  
  // Channel type cache
  const channelTypeRef = useRef<'group' | 'direct' | null>(null);

  const { formatMessage } = useMessageFormatter();
  
  // Set default page size
  const PAGE_SIZE = CONNECTION_CONSTANTS.MESSAGE_FETCH_LIMIT || 30;

  // Function to format a single message
  const formatSingleMessage = useCallback(async (message: any): Promise<Message | null> => {
    try {
      let sender = senderCache.current.get(message.sender_id);
      
      if (!sender) {
        // Only fetch this sender's details if not cached
        const { data: senderData, error: senderError } = await supabase
          .rpc('get_message_sender_details', {
            sender_id: message.sender_id
          });

        if (senderError) {
          console.error('[Chat] Error fetching sender:', senderError);
          return null;
        }

        sender = senderData?.[0];
        if (!sender) {
          console.error('[Chat] Sender not found:', message.sender_id);
          return null;
        }
        
        // Cache sender details
        senderCache.current.set(message.sender_id, {
          id: sender.id,
          name: sender.name,
          avatarUrl: sender.avatar_url || ''
        });
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
          avatarUrl: sender.avatar_url || ''
        },
        timestamp: new Date(message.created_at),
        parent_message_id: message.parent_message_id,
        reactions: parsedReactions,
        attachments: parsedAttachments,
        channelType: channelTypeRef.current || 'group'
      } as Message;
    } catch (error) {
      console.error('[Chat] Error formatting message:', error, message);
      return null;
    }
  }, []);

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
      
      // First get the channel type if it's not cached
      if (!channelTypeRef.current) {
        const { data: channelData, error: channelError } = await supabase
          .from('chat_channels')
          .select('channel_type, created_by')
          .eq('id', channelId)
          .single();

        if (channelError) throw channelError;

        if (!channelData?.channel_type || !isValidChannelType(channelData.channel_type)) {
          throw new Error('Invalid channel type');
        }

        channelTypeRef.current = channelData.channel_type;
      }
      
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
      const senderIds = Array.from(
        new Set(
          messagesData
            .map(msg => msg.sender_id)
            .filter(id => !senderCache.current.has(id))
        )
      );
      
      // Only batch fetch for senders we don't have cached
      if (senderIds.length > 0) {
        const { data: sendersData, error: sendersError } = await supabase
          .rpc('batch_get_message_sender_details', {
            p_sender_ids: senderIds
          });
        
        if (sendersError) {
          console.error('[Chat] Error fetching batch sender details:', sendersError);
          throw sendersError;
        }
        
        // Add to cache
        if (sendersData) {
          sendersData.forEach(sender => {
            senderCache.current.set(sender.id, {
              id: sender.id,
              name: sender.name,
              avatarUrl: sender.avatar_url || ''
            });
          });
        }
      }

      // Format all messages in parallel
      const formattedMessages = await Promise.all(
        messagesData.map(message => formatSingleMessage(message))
      );

      // Filter out any null results and assert as Message[]
      const validMessages = formattedMessages.filter(Boolean) as Message[];

      if (fromScratch) {
        setMessages(validMessages);
      } else {
        // Append older messages at the beginning
        setMessages(prev => {
          // Check for duplicates
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueNewMessages = validMessages.filter(m => !existingIds.has(m.id));
          return [...uniqueNewMessages, ...prev];
        });
      }
    } catch (error) {
      console.error('[Chat] Error fetching messages:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [channelId, messages, PAGE_SIZE, formatSingleMessage]);

  const loadMoreMessages = useCallback(() => {
    if (!isLoadingMore && hasMoreMessages) {
      fetchMessages(false);
    }
  }, [fetchMessages, isLoadingMore, hasMoreMessages]);
  
  // Handlers for real-time updates
  const handleNewMessage = useCallback(async (payload: any) => {
    if (!payload.new || !payload.new.id) return;
    
    // Don't add duplicates
    if (messages.some(m => m.id === payload.new.id)) {
      return;
    }
    
    const formattedMessage = await formatSingleMessage(payload.new);
    if (formattedMessage) {
      setMessages(prev => [...prev, formattedMessage]);
    }
  }, [messages, formatSingleMessage]);
  
  const handleMessageUpdate = useCallback(async (payload: any) => {
    if (!payload.new || !payload.new.id) return;
    
    const formattedMessage = await formatSingleMessage(payload.new);
    if (formattedMessage) {
      setMessages(prev => 
        prev.map(m => m.id === payload.new.id ? formattedMessage : m)
      );
    }
  }, [formatSingleMessage]);
  
  const handleMessageDelete = useCallback((payload: any) => {
    if (!payload.old || !payload.old.id) return;
    
    setMessages(prev => 
      prev.filter(m => m.id !== payload.old.id)
    );
  }, []);

  const { 
    subscriptionStates, 
    handleSubscriptionError 
  } = useSubscriptions(
    channelId,
    currentUserId,
    retryCount,
    setRetryCount,
    handleNewMessage,
    handleMessageUpdate,
    handleMessageDelete
  );

  const { 
    sendMessage,
    deleteMessage: handleDeleteMessage,
    reactToMessage,
    markMentionsAsRead,
  } = useMessageActions(
    channelId,
    currentUserId,
    () => {}  // No need to fetch all messages on action completion anymore
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
      // Clear channel type cache when channel changes
      channelTypeRef.current = null;
      fetchMessages(true);
    }
  }, [channelId, fetchMessages]);

  useEffect(() => {
    setSubscriptionStatus({
      messages: subscriptionStates.messages?.status === 'SUBSCRIBED'
    });
  }, [subscriptionStates]);

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMoreMessages,
    loadMoreMessages,
    isSubscribed: subscriptionStatus.messages,
    subscriptionStatus,
    sendMessage,
    deleteMessage: handleDeleteMessage,
    currentUserId,
    reactToMessage,
    markMentionsAsRead,
  };
};
