import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Message, MessageData, Attachment, isAttachment } from '@/types/messaging';
import { useMessageFormatter } from './chat/useMessageFormatter';
import { useSubscriptions } from './chat/useSubscriptions';
import { useMessageActions } from './chat/useMessageActions';

const isValidChannelType = (type: string): type is 'group' | 'direct' => {
  return type === 'group' || type === 'direct';
};

export const useChat = (channelId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    messages: boolean;
    mentions: boolean;
  }>({ messages: false, mentions: false });

  const messageCache = useRef<Record<string, Message>>({});
  const lastFetchTimestamp = useRef<string | null>(null);
  
  const { formatMessage } = useMessageFormatter();

  const fetchMessages = useCallback(async () => {
    if (!channelId) return;
    
    setIsLoading(true);
    try {
      console.log('[Chat] Fetching messages for channel:', channelId);
      
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

      // Query messages with consistent ascending order by creation date
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });  // Always use ascending for consistent order

      if (messagesError) {
        console.error('[Chat] Error fetching messages:', messagesError);
        throw messagesError;
      }

      console.log('[Chat] Retrieved messages:', messagesData?.length);

      const formattedMessages: Message[] = [];
      const senderDetailsPromises = messagesData?.map(async (message) => {
        try {
          const { data: senderData, error: senderError } = await supabase
            .rpc('get_message_sender_details', {
              sender_id: message.sender_id
            });

          if (senderError) {
            console.error('[Chat] Error fetching sender details:', senderError);
            return null;
          }

          const sender = senderData?.[0];
          if (!sender?.id || !sender?.name) {
            console.error('[Chat] Invalid sender data:', sender);
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

          const formattedMessage: Message = {
            id: message.id,
            content: message.content,
            sender: {
              id: sender.id,
              name: sender.name,
              avatarUrl: sender.avatar_url || ''
            },
            timestamp: new Date(message.created_at),
            reactions: parsedReactions,
            attachments: parsedAttachments,
            channelType: channelType
          };

          // Update message cache for incremental updates
          messageCache.current[message.id] = formattedMessage;
          
          return formattedMessage;
        } catch (error) {
          console.error('[Chat] Error formatting message:', error, message);
          return null;
        }
      }) || [];

      const formattedMessagesResults = await Promise.all(senderDetailsPromises);
      const validMessages = formattedMessagesResults.filter((msg): msg is Message => 
        msg !== null && 
        typeof msg === 'object' &&
        typeof msg.id === 'string' &&
        typeof msg.content === 'string' &&
        typeof msg.sender === 'object' &&
        typeof msg.sender.id === 'string' &&
        typeof msg.sender.name === 'string' &&
        msg.timestamp instanceof Date
      );
      
      // Keep messages in chronological order (newest last)
      formattedMessages.push(...validMessages);
      setMessages(formattedMessages);
      
      // Store the timestamp of the most recent message for incremental updates
      if (messagesData && messagesData.length > 0) {
        const timestamps = messagesData.map(msg => msg.created_at);
        lastFetchTimestamp.current = new Date(Math.max(...timestamps.map(ts => new Date(ts).getTime()))).toISOString();
      }

      console.log('[Chat] Messages processed and set:', formattedMessages.length);
    } catch (error) {
      console.error('[Chat] Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [channelId]);

  const handleRealtimeMessage = useCallback(async (payload: any) => {
    console.log('[Chat] Realtime message received:', payload);
    
    if (!payload || !payload.new || !channelId) return;
    
    try {
      const messageData = payload.new;
      if (messageData.channel_id !== channelId) return;
      
      // For inserts and updates, format and add the message
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const { data: senderData, error: senderError } = await supabase
          .rpc('get_message_sender_details', {
            sender_id: messageData.sender_id
          });

        if (senderError) {
          console.error('[Chat] Realtime: Error fetching sender details:', senderError);
          return;
        }

        const sender = senderData?.[0];
        if (!sender?.id || !sender?.name) {
          console.error('[Chat] Realtime: Invalid sender data:', sender);
          return;
        }

        // Get channel type for the message
        const { data: channelData } = await supabase
          .from('chat_channels')
          .select('channel_type')
          .eq('id', channelId)
          .single();
        
        const formattedMessage: Message = {
          id: messageData.id,
          content: messageData.content,
          sender: {
            id: sender.id,
            name: sender.name,
            avatarUrl: sender.avatar_url || ''
          },
          timestamp: new Date(messageData.created_at),
          reactions: messageData.reactions || {},
          channelType: channelData?.channel_type as 'group' | 'direct' || 'group'
        };
        
        // Update message cache
        messageCache.current[messageData.id] = formattedMessage;
        
        setMessages(prev => {
          // Check if message already exists
          const existingIndex = prev.findIndex(m => m.id === messageData.id);
          
          if (existingIndex >= 0) {
            // Update existing message
            const newMessages = [...prev];
            newMessages[existingIndex] = formattedMessage;
            return newMessages;
          } else {
            // Add new message
            return [...prev, formattedMessage];
          }
        });
        
        console.log('[Chat] Realtime: Message added/updated:', formattedMessage);
      } 
      // For deletions, remove the message
      else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old.id;
        setMessages(prev => prev.filter(m => m.id !== deletedId));
        delete messageCache.current[deletedId];
        console.log('[Chat] Realtime: Message deleted:', deletedId);
      }
    } catch (error) {
      console.error('[Chat] Error handling realtime message:', error);
    }
  }, [channelId]);

  const { 
    subscriptionStates, 
    handleSubscriptionError 
  } = useSubscriptions(
    channelId,
    currentUserId,
    retryCount,
    setRetryCount,
    handleRealtimeMessage
  );

  const { 
    sendMessage,
    deleteMessage: handleDeleteMessage,
    reactToMessage,
    markMentionsAsRead,
  } = useMessageActions(
    channelId,
    currentUserId,
    fetchMessages
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
      // Clear the message cache when switching channels
      messageCache.current = {};
      lastFetchTimestamp.current = null;
      fetchMessages();
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
    isSubscribed: subscriptionStatus.messages && subscriptionStatus.mentions,
    subscriptionStatus,
    sendMessage,
    deleteMessage: handleDeleteMessage,
    currentUserId,
    reactToMessage,
    markMentionsAsRead,
  };
};
