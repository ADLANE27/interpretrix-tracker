import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { Message, MessageData, Attachment } from '@/types/messaging';
import { useToast } from './use-toast';
import { useMessageCache } from './chat/useMessageCache';
import { useBatchSendersFetch } from './chat/useBatchSendersFetch';

// Helper function to convert MessageData to Message
const convertMessageData = (data: MessageData, senderInfo?: { name: string, avatarUrl: string }): Message => {
  return {
    id: data.id,
    content: data.content,
    sender: {
      id: data.sender_id,
      name: senderInfo?.name || 'Unknown User',
      avatarUrl: senderInfo?.avatarUrl || '',
    },
    timestamp: new Date(data.created_at),
    parent_message_id: data.parent_message_id,
    reactions: data.reactions,
    attachments: data.attachments,
  };
};

export const useChat = (channelId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [newMessageSubscription, setNewMessageSubscription] = useState<any>(null);
  const [deletedMessageSubscription, setDeletedMessageSubscription] = useState<any>(null);

  // Use our caching hooks
  const { 
    getCachedMessages, 
    setCachedMessages,
    addMessageToCache,
    removeMessageFromCache  
  } = useMessageCache();
  
  const { fetchSendersInBatch } = useBatchSendersFetch();

  const { toast } = useToast();

  // Fetch messages with pagination
  const fetchMessages = useCallback(async (limit = 50, before?: string) => {
    if (!channelId) return [];
    
    setIsLoading(true);
    
    // First check the cache
    const cachedMessages = getCachedMessages(channelId);
    if (cachedMessages && !before) {
      console.log('[Chat] Using cached messages');
      setMessages(cachedMessages);
      setIsLoading(false);
      return cachedMessages;
    }
    
    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (before) {
      query = query.lt('created_at', before);
    }
    
    try {
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        setHasMoreMessages(false);
        setIsLoading(false);
        if (!before) {
          setMessages([]);
          setCachedMessages(channelId, []);
        }
        return [];
      }
      
      // Extract all sender IDs for batch fetching
      const senderIds = data.map(msg => msg.sender_id);
      const senderDetails = await fetchSendersInBatch(senderIds);
      
      // Convert raw data to message objects
      const fetchedMessages: Message[] = data.map((msgData: MessageData) => {
        const senderInfo = senderDetails[msgData.sender_id];
        return convertMessageData(msgData, senderInfo);
      });
      
      setHasMoreMessages(data.length === limit);
      
      // Update state based on whether this is initial load or pagination
      if (before) {
        setMessages(prev => [...prev, ...fetchedMessages]);
        // Update cache with all messages
        setCachedMessages(channelId, [...messages, ...fetchedMessages]);
      } else {
        setMessages(fetchedMessages);
        setCachedMessages(channelId, fetchedMessages);
      }
      
      setIsLoading(false);
      return fetchedMessages;
      
    } catch (error) {
      console.error('Error fetching messages:', error);
      setIsLoading(false);
      return [];
    }
  }, [channelId, messages, getCachedMessages, setCachedMessages, fetchSendersInBatch]);

  // Subscribe to new messages
  useEffect(() => {
    if (!channelId) return;
    
    // Clear old subscription if exists
    if (newMessageSubscription) {
      newMessageSubscription.unsubscribe();
    }
    
    const subscription = supabase
      .channel('public:chat_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          if (!payload.new) return;
          
          const newMessageData = payload.new as MessageData;
          
          // Fetch sender details for the new message
          const senderDetails = await fetchSendersInBatch([newMessageData.sender_id]);
          const senderInfo = senderDetails[newMessageData.sender_id];
          
          // Convert raw data to message object
          const newMessage = convertMessageData(newMessageData, senderInfo);
          
          setMessages(prev => [newMessage, ...prev]);
          addMessageToCache(channelId, newMessage);
        }
      )
      .subscribe();
    
    setNewMessageSubscription(subscription);
    
    return () => {
      subscription?.unsubscribe();
    };
  }, [channelId, fetchSendersInBatch, addMessageToCache]);

  // Subscribe to deleted messages
  useEffect(() => {
    if (!channelId) return;
    
    // Clear old subscription if exists
    if (deletedMessageSubscription) {
      deletedMessageSubscription.unsubscribe();
    }
    
    const subscription = supabase
      .channel('public:chat_messages')
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          if (!payload.old) return;
          
          const deletedMessageId = (payload.old as MessageData).id;
          
          setMessages(prev => prev.filter(msg => msg.id !== deletedMessageId));
          removeMessageFromCache(channelId, deletedMessageId);
        }
      )
      .subscribe();
    
    setDeletedMessageSubscription(subscription);
    
    return () => {
      subscription?.unsubscribe();
    };
  }, [channelId, removeMessageFromCache]);

  // Send message implementation
  const sendMessage = useCallback(async (content: string, parentMessageId?: string) => {
    if (!channelId) return null;
    
    // Create a temporary message ID for optimistic UI
    const tempId = uuidv4();
    const currentUser = await supabase.auth.getUser();
    
    if (!currentUser.data.user) {
      toast({
        title: "Error",
        description: "You must be logged in to send messages",
        variant: "destructive",
      });
      return null;
    }
    
    const userId = currentUser.data.user.id;
    
    // Create optimistic message
    const optimisticMessage: Message = {
      id: tempId,
      content,
      sender: {
        id: userId,
        name: 'You', // Will be replaced with actual name
      },
      timestamp: new Date(),
      parent_message_id: parentMessageId,
      isOptimistic: true,
    };
    
    // Add optimistic message to UI
    setMessages(prev => [optimisticMessage, ...prev]);
    
    try {
      // Send actual message to server
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          content,
          channel_id: channelId,
          sender_id: userId,
          parent_message_id: parentMessageId,
        })
        .select('*')
        .single();
      
      if (error) throw error;
      
      // Fetch sender info for the new message
      const { data: senderData } = await supabase
        .rpc('get_message_sender_details', { sender_id: userId });
      
      let senderInfo;
      if (senderData && senderData.length > 0) {
        senderInfo = {
          name: senderData[0].name,
          avatarUrl: senderData[0].avatar_url || '',
        };
      }
      
      // Replace optimistic message with real one
      const realMessage = convertMessageData(data, senderInfo);
      
      setMessages(prev => 
        prev.map(msg => msg.id === tempId ? realMessage : msg)
      );
      
      // Update cache
      addMessageToCache(channelId, realMessage);
      
      return realMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove failed optimistic message
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      
      return null;
    }
  }, [channelId, toast, addMessageToCache]);

  // Delete message implementation
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!channelId) return false;
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);
      
      if (error) throw error;
      
      // Update state optimistically
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      // Update cache
      removeMessageFromCache(channelId, messageId);
      
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
      return false;
    }
  }, [channelId, toast, removeMessageFromCache]);

  // Load initial messages on channel ID change
  useEffect(() => {
    setMessages([]);
    setHasMoreMessages(true);
    fetchMessages();
  }, [channelId, fetchMessages]);

  // Load more messages handler for infinite scrolling
  const loadMoreMessages = useCallback(async () => {
    if (!channelId || isLoading || !hasMoreMessages) return;
    
    const oldestMessage = [...messages].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    )[0];
    
    if (oldestMessage) {
      const oldestTimestamp = oldestMessage.timestamp.toISOString();
      await fetchMessages(20, oldestTimestamp);
    }
  }, [channelId, messages, isLoading, hasMoreMessages, fetchMessages]);

  return {
    messages,
    isLoading,
    sendMessage,
    deleteMessage,
    // Additional exports:
    hasMoreMessages,
    loadMoreMessages,
  };
};
