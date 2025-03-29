import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Message, MessageData, Attachment, isAttachment } from '@/types/messaging';
import { useMessageFormatter } from './chat/useMessageFormatter';
import { useSubscriptions } from './chat/useSubscriptions';
import { useMessageActions } from './chat/useMessageActions';

const isValidChannelType = (type: string): type is 'group' | 'direct' => {
  return type === 'group' || type === 'direct';
};

const MAX_MESSAGES = 100;

export const useChat = (channelId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  const messagesMap = useRef<Map<string, Message>>(new Map());
  const lastFetchTimestamp = useRef<string | null>(null);
  const userRole = useRef<'admin' | 'interpreter' | null>(null);
  const processingMessage = useRef<boolean>(false);
  
  const { formatMessage } = useMessageFormatter();

  useEffect(() => {
    if (channelId) {
      messagesMap.current.clear();
    }
  }, [channelId]);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          userRole.current = data.role as 'admin' | 'interpreter';
          console.log(`[useChat] User role identified as: ${userRole.current}`);
        }
      } catch (error) {
        console.error('[useChat] Error determining user role:', error);
      }
    };
    
    checkUserRole();
  }, []);

  const fetchMessages = useCallback(async (offset = 0, limit = MAX_MESSAGES) => {
    if (!channelId) return;
    
    setIsLoading(true);
    try {
      console.log(`[useChat ${userRole.current}] Fetching messages for channel:`, channelId, `(offset: ${offset}, limit: ${limit})`);
      
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

      const { count, error: countError } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('channel_id', channelId);

      if (countError) throw countError;
      
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (messagesError) {
        console.error(`[useChat ${userRole.current}] Error fetching messages:`, messagesError);
        throw messagesError;
      }
      
      setHasMoreMessages(count !== null && count > offset + messagesData.length);
      console.log(`[useChat ${userRole.current}] Retrieved messages:`, messagesData?.length, `(total: ${count})`);

      const senderDetailsPromises = messagesData?.map(async (message) => {
        try {
          if (messagesMap.current.has(message.id)) {
            const existingMessage = messagesMap.current.get(message.id)!;
            existingMessage.timestamp = new Date(message.created_at);
            return existingMessage;
          }
          
          const { data: senderData, error: senderError } = await supabase
            .rpc('get_message_sender_details', {
              sender_id: message.sender_id
            });

          if (senderError) {
            console.error(`[useChat ${userRole.current}] Error fetching sender details:`, senderError);
            return null;
          }

          const sender = senderData?.[0];
          if (!sender?.id || !sender?.name) {
            console.error(`[useChat ${userRole.current}] Invalid sender data:`, sender);
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
            console.error(`[useChat ${userRole.current}] Error parsing reactions:`, e);
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
              avatar_url: sender.avatar_url || ''
            },
            timestamp: new Date(message.created_at),
            parent_message_id: message.parent_message_id,
            reactions: parsedReactions as any[] || [],
            attachments: parsedAttachments,
            channelType: channelType
          };

          messagesMap.current.set(message.id, formattedMessage);
          
          return formattedMessage;
        } catch (error) {
          console.error(`[useChat ${userRole.current}] Error formatting message:`, error, message);
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
      
      if (offset === 0) {
        const messagesArray = Array.from(messagesMap.current.values())
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        setMessages(messagesArray);
      } else {
        const allMessages = Array.from(messagesMap.current.values())
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        setMessages(allMessages);
      }
      
      if (messagesData && messagesData.length > 0) {
        const timestamps = messagesData.map(msg => msg.created_at);
        lastFetchTimestamp.current = new Date(Math.max(...timestamps.map(ts => new Date(ts).getTime()))).toISOString();
      }

      console.log(`[useChat ${userRole.current}] Messages processed and set:`, messagesMap.current.size);
    } catch (error) {
      console.error(`[useChat ${userRole.current}] Error fetching messages:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [channelId]);

  const loadMoreMessages = useCallback(() => {
    if (isLoading || !hasMoreMessages) return;
    fetchMessages(messages.length);
  }, [fetchMessages, messages.length, isLoading, hasMoreMessages]);

  const handleRealtimeMessage = useCallback(async (payload: any) => {
    if (processingMessage.current) return;
    
    processingMessage.current = true;
    console.log(`[useChat ${userRole.current}] Realtime message received:`, payload.eventType, payload);
    
    try {
      if (!payload || !payload.new || !channelId) {
        processingMessage.current = false;
        return;
      }
      
      const messageData = payload.new;
      if (messageData.channel_id !== channelId) {
        processingMessage.current = false;
        return;
      }
      
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        if (payload.eventType === 'INSERT' && messagesMap.current.has(messageData.id)) {
          console.log(`[useChat ${userRole.current}] Skipping duplicate message:`, messageData.id);
          processingMessage.current = false;
          return;
        }
        
        const { data: senderData, error: senderError } = await supabase
          .rpc('get_message_sender_details', {
            sender_id: messageData.sender_id
          });

        if (senderError) {
          console.error(`[useChat ${userRole.current}] Realtime: Error fetching sender details:`, senderError);
          processingMessage.current = false;
          return;
        }

        const sender = senderData?.[0];
        if (!sender?.id || !sender?.name) {
          console.error(`[useChat ${userRole.current}] Realtime: Invalid sender data:`, sender);
          processingMessage.current = false;
          return;
        }

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
            avatar_url: sender.avatar_url || ''
          },
          timestamp: new Date(messageData.created_at),
          parent_message_id: messageData.parent_message_id,
          reactions: messageData.reactions || [],
          channelType: channelData?.channel_type as 'group' | 'direct' || 'group'
        };
        
        messagesMap.current.set(messageData.id, formattedMessage);
        
        const messagesArray = Array.from(messagesMap.current.values())
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        setMessages(messagesArray);
        
        console.log(`[useChat ${userRole.current}] Realtime: Message added/updated:`, formattedMessage.id, 'For channel:', channelId);
        
        const messageTimestamp = new Date(messageData.created_at);
        if (!lastFetchTimestamp.current || messageTimestamp > new Date(lastFetchTimestamp.current)) {
          lastFetchTimestamp.current = messageTimestamp.toISOString();
          setLastFetchTime(new Date());
        }
      } else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old.id;
        messagesMap.current.delete(deletedId);
        
        const messagesArray = Array.from(messagesMap.current.values())
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        setMessages(messagesArray);
        console.log(`[useChat ${userRole.current}] Realtime: Message deleted:`, deletedId);
      }
    } catch (error) {
      console.error(`[useChat ${userRole.current}] Error handling realtime message:`, error);
    } finally {
      processingMessage.current = false;
    }
  }, [channelId]);

  const { 
    subscriptionStates, 
    handleSubscriptionError,
    isSubscribed,
    lastEventTimestamp
  } = useSubscriptions(
    channelId,
    currentUserId,
    retryCount,
    setRetryCount,
    handleRealtimeMessage
  );

  const handleDeleteMessage = async (messageId: string) => {
    try {
      messagesMap.current.delete(messageId);
      
      const updatedMessages = Array.from(messagesMap.current.values())
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      setMessages(updatedMessages);
      
      await deleteMessage(messageId);
      
      console.log(`[useChat ${userRole.current}] Message deleted locally:`, messageId);
    } catch (error) {
      console.error(`[useChat ${userRole.current}] Error handling message deletion:`, error);
      fetchMessages(0);
    }
  };

  const { 
    sendMessage,
    deleteMessage,
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
      console.log(`[useChat ${userRole.current}] Initial messages fetch for channel:`, channelId);
      messagesMap.current.clear();
      lastFetchTimestamp.current = null;
      fetchMessages(0);
    }
  }, [channelId, fetchMessages]);

  useEffect(() => {
    if (!channelId) return;
    
    const refreshInterval = setInterval(() => {
      const shouldRefresh = !lastFetchTime || (new Date().getTime() - lastFetchTime.getTime() > 10000);
      if (shouldRefresh) {
        console.log(`[useChat ${userRole.current}] Performing periodic refresh of messages`);
        fetchMessages(0);
      }
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [channelId, fetchMessages, lastFetchTime]);

  const forceFetch = useCallback(() => {
    console.log(`[useChat ${userRole.current}] Force fetching messages`);
    fetchMessages(0);
  }, [fetchMessages]);

  return {
    messages,
    isLoading,
    isSubscribed,
    subscriptionStatus: subscriptionStates,
    sendMessage,
    deleteMessage: handleDeleteMessage,
    currentUserId,
    reactToMessage,
    markMentionsAsRead,
    forceFetch,
    loadMoreMessages,
    hasMoreMessages
  };
};
