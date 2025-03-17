import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Message, MessageData, Attachment, isAttachment } from '@/types/messaging';
import { useMessageFormatter } from './chat/useMessageFormatter';
import { useSubscriptions } from './chat/useSubscriptions';
import { useMessageActions } from './chat/useMessageActions';
import { useMessageCache } from './chat/useMessageCache';
import { useBatchSendersFetch } from './chat/useBatchSendersFetch';

const isValidChannelType = (type: string): type is 'group' | 'direct' => {
  return type === 'group' || type === 'direct';
};

export const useChat = (channelId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    messages: boolean;
    mentions: boolean;
  }>({ messages: false, mentions: false });

  const pageSize = 50;
  const initialFetchRef = useRef(false);
  const optimisticMessagesRef = useRef<Message[]>([]);

  const { formatMessage } = useMessageFormatter();
  const { 
    getCachedMessages, 
    setCachedMessages, 
    addMessageToCache, 
    removeMessageFromCache 
  } = useMessageCache();
  const { fetchSendersInBatch } = useBatchSendersFetch();

  const fetchMessages = useCallback(async (isInitialFetch = false, pageToFetch = page) => {
    if (!channelId) return;
    
    if (isInitialFetch) {
      const cachedMessages = getCachedMessages(channelId);
      if (cachedMessages) {
        setMessages(cachedMessages);
      }
    }
    
    setIsLoading(true);
    try {
      console.log(`[Chat] Fetching messages for channel: ${channelId}, page: ${pageToFetch}`);
      
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

      const from = (pageToFetch - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data: messagesData, error: messagesError, count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact' })
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (messagesError) {
        console.error('[Chat] Error fetching messages:', messagesError);
        throw messagesError;
      }

      console.log(`[Chat] Retrieved ${messagesData?.length} messages out of total ${count}`);
      
      if (count !== null) {
        setHasMore(from + messagesData.length < count);
      }

      if (!messagesData || messagesData.length === 0) {
        if (isInitialFetch) {
          setMessages([]);
          setCachedMessages(channelId, []);
        }
        setIsLoading(false);
        return;
      }

      const senderIds = messagesData.map(msg => msg.sender_id);
      const sendersMap = await fetchSendersInBatch(senderIds);
      
      const formattedMessages: Message[] = [];
      
      for (const message of messagesData) {
        const sender = sendersMap[message.sender_id];
        
        if (!sender) {
          console.warn(`[Chat] Missing sender data for ID: ${message.sender_id}`);
          continue;
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
            avatarUrl: sender.avatarUrl || ''
          },
          timestamp: new Date(message.created_at),
          reactions: parsedReactions,
          attachments: parsedAttachments,
          parent_message_id: message.parent_message_id,
          channelType: channelType
        };

        formattedMessages.push(formattedMessage);
      }
      
      formattedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      if (isInitialFetch || pageToFetch === 1) {
        setMessages(formattedMessages);
        setCachedMessages(channelId, formattedMessages);
      } else {
        setMessages(prev => {
          const combinedMessages = [...formattedMessages, ...prev];
          setCachedMessages(channelId, combinedMessages);
          return combinedMessages;
        });
      }
    } catch (error) {
      console.error('[Chat] Error fetching messages:', error);
    } finally {
      setIsLoading(false);
      if (isInitialFetch) {
        initialFetchRef.current = true;
      }
    }
  }, [channelId, page, pageSize, getCachedMessages, setCachedMessages, fetchSendersInBatch]);

  const loadMoreMessages = useCallback(() => {
    if (hasMore && !isLoading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMessages(false, nextPage);
    }
  }, [hasMore, isLoading, page, fetchMessages]);

  const { 
    subscriptionStates, 
    handleSubscriptionError 
  } = useSubscriptions(
    channelId,
    currentUserId,
    retryCount,
    setRetryCount,
    () => fetchMessages(true, 1)
  );

  const createOptimisticMessage = useCallback((
    content: string,
    parentMessageId: string | null | undefined,
    attachments: Attachment[] = []
  ): Message => {
    if (!currentUserId) throw new Error("Missing user ID");
    
    return {
      id: `optimistic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      content,
      sender: {
        id: currentUserId,
        name: 'You',
        avatarUrl: ''
      },
      timestamp: new Date(),
      reactions: {},
      attachments,
      parent_message_id: parentMessageId,
      isOptimistic: true
    };
  }, [currentUserId]);

  const sendMessageWithOptimisticUpdate = useCallback(async (
    content: string,
    parentMessageId?: string | null,
    files: File[] = []
  ): Promise<string> => {
    if (!channelId || !currentUserId) throw new Error("Missing required data");
    if (!content.trim() && files.length === 0) throw new Error("Message cannot be empty");
    
    try {
      const optimisticAttachments: Attachment[] = files.map(file => ({
        url: URL.createObjectURL(file),
        filename: file.name,
        type: file.type,
        size: file.size,
        isOptimistic: true
      }));
      
      const optimisticMessage = createOptimisticMessage(
        content.trim(),
        parentMessageId,
        optimisticAttachments
      );
      
      setMessages(prev => [...prev, optimisticMessage]);
      optimisticMessagesRef.current = [...optimisticMessagesRef.current, optimisticMessage];
      
      const { sendMessage } = useMessageActions(channelId, currentUserId, fetchMessages);
      const messageId = await sendMessage(content, parentMessageId, files);
      
      optimisticMessagesRef.current = optimisticMessagesRef.current.filter(
        msg => msg.id !== optimisticMessage.id
      );
      
      return messageId;
    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      
      setMessages(prev => prev.filter(msg => 
        !msg.isOptimistic || msg.id !== optimisticMessagesRef.current[0]?.id
      ));
      optimisticMessagesRef.current.shift();
      
      throw error;
    }
  }, [channelId, currentUserId, createOptimisticMessage]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);
      
      removeMessageFromCache(channelId, messageId);
      
    } catch (error) {
      console.error('[Chat] Error deleting message:', error);
      fetchMessages(true, 1);
      throw error;
    }
  }, [channelId, fetchMessages, removeMessageFromCache]);

  const handleReactToMessage = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUserId) return;

    try {
      setMessages(prev => {
        return prev.map(msg => {
          if (msg.id !== messageId) return msg;
          
          const currentReactions = {...msg.reactions};
          const currentUsers = currentReactions[emoji] || [];
          
          let updatedUsers;
          if (currentUsers.includes(currentUserId)) {
            updatedUsers = currentUsers.filter(id => id !== currentUserId);
          } else {
            updatedUsers = [...currentUsers, currentUserId];
          }
          
          const updatedReactions = {
            ...currentReactions,
            [emoji]: updatedUsers
          };
          
          if (updatedUsers.length === 0) {
            delete updatedReactions[emoji];
          }
          
          return {
            ...msg,
            reactions: updatedReactions
          };
        });
      });
      
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (!messages) return;

      const currentReactions = messages.reactions as Record<string, string[]> || {};
      const currentUsers = currentReactions[emoji] || [];
      
      let updatedUsers;
      if (currentUsers.includes(currentUserId)) {
        updatedUsers = currentUsers.filter(id => id !== currentUserId);
      } else {
        updatedUsers = [...currentUsers, currentUserId];
      }
      
      const updatedReactions = {
        ...currentReactions,
        [emoji]: updatedUsers
      };
      
      if (updatedUsers.length === 0) {
        delete updatedReactions[emoji];
      }
      
      await supabase
        .from('chat_messages')
        .update({ reactions: updatedReactions })
        .eq('id', messageId);
        
    } catch (error) {
      console.error('[Chat] Error updating reaction:', error);
      fetchMessages(true, 1);
    }
  }, [currentUserId, fetchMessages]);

  const markMentionsAsRead = useCallback(async () => {
    if (!currentUserId || !channelId) return;

    try {
      await supabase
        .from('message_mentions')
        .update({ status: 'read' })
        .eq('mentioned_user_id', currentUserId)
        .eq('channel_id', channelId)
        .eq('status', 'unread');
        
    } catch (error) {
      console.error('[Chat] Error marking mentions as read:', error);
    }
  }, [currentUserId, channelId]);

  const retryConnection = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (channelId && !initialFetchRef.current) {
      console.log('[Chat] Initial messages fetch for channel:', channelId);
      setPage(1);
      fetchMessages(true, 1);
    }
  }, [channelId, fetchMessages]);

  useEffect(() => {
    setSubscriptionStatus({
      messages: subscriptionStates.messages?.status === 'SUBSCRIBED',
      mentions: subscriptionStates.mentions?.status === 'SUBSCRIBED'
    });
  }, [subscriptionStates]);

  useEffect(() => {
    if (!channelId || !subscriptionStatus.messages) return;
    
    const channel = supabase.channel(`messages-realtime-${channelId}`);
    
    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`
      }, async (payload) => {
        console.log('[Chat] New message received:', payload);
        
        try {
          const newMessageData = payload.new as MessageData;
          
          const { fetchSendersInBatch } = useBatchSendersFetch();
          const sendersMap = await fetchSendersInBatch([newMessageData.sender_id]);
          const sender = sendersMap[newMessageData.sender_id];
          
          if (!sender) {
            console.warn('[Chat] Missing sender data for new message');
            return;
          }
          
          const formattedMessage = await formatMessage(newMessageData);
          
          if (formattedMessage) {
            const isOptimistic = optimisticMessagesRef.current.some(
              m => m.content === formattedMessage.content && 
              Math.abs(m.timestamp.getTime() - formattedMessage.timestamp.getTime()) < 5000
            );
            
            if (!isOptimistic) {
              setMessages(prev => [...prev, formattedMessage]);
              addMessageToCache(channelId, formattedMessage);
            } else {
              setMessages(prev => 
                prev.filter(m => !m.isOptimistic).concat(formattedMessage)
              );
              
              optimisticMessagesRef.current = optimisticMessagesRef.current
                .filter(m => m.content !== formattedMessage.content);
                
              addMessageToCache(channelId, formattedMessage);
            }
          }
        } catch (error) {
          console.error('[Chat] Error processing new message:', error);
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, subscriptionStatus.messages, formatMessage, addMessageToCache]);

  return {
    messages,
    isLoading,
    isSubscribed: subscriptionStatus.messages && subscriptionStatus.mentions,
    subscriptionStatus,
    sendMessage: sendMessageWithOptimisticUpdate,
    deleteMessage: handleDeleteMessage,
    currentUserId,
    reactToMessage: handleReactToMessage,
    markMentionsAsRead,
    retry: retryConnection,
    fetchMessages: () => fetchMessages(true, 1),
    loadMoreMessages,
    hasMore
  };
};
