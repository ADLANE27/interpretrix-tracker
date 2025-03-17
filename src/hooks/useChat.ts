
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
    reactions: data.reactions || {},
    attachments: data.attachments || [],
    isOptimistic: false,
  };
};

export const useChat = (channelId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [newMessageSubscription, setNewMessageSubscription] = useState<any>(null);
  const [deletedMessageSubscription, setDeletedMessageSubscription] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Use our caching hooks
  const { 
    getCachedMessages, 
    setCachedMessages,
    addMessageToCache,
    removeMessageFromCache  
  } = useMessageCache();
  
  const { fetchSendersInBatch } = useBatchSendersFetch();

  const { toast } = useToast();

  // Get current user ID on init
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data.user?.id || null);
    };
    getCurrentUser();
  }, []);

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
      const fetchedMessages: Message[] = data.map((msgData: any) => {
        const senderInfo = senderDetails[msgData.sender_id];
        return convertMessageData(msgData as MessageData, senderInfo);
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
          
          const newMessageData = payload.new as any;
          
          // Fetch sender details for the new message
          const senderDetails = await fetchSendersInBatch([newMessageData.sender_id]);
          const senderInfo = senderDetails[newMessageData.sender_id];
          
          // Convert raw data to message object
          const newMessage = convertMessageData(newMessageData as MessageData, senderInfo);
          
          setMessages(prev => [newMessage, ...prev]);
          addMessageToCache(channelId, newMessage);
        }
      )
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED');
        setSubscriptionStatus(status === 'SUBSCRIBED' ? 'connected' : 'disconnected');
      });
    
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
          
          const deletedMessageId = (payload.old as any).id;
          
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

  // Retry connection function
  const retry = useCallback(() => {
    if (newMessageSubscription) {
      newMessageSubscription.unsubscribe();
      setNewMessageSubscription(null);
    }
    
    if (deletedMessageSubscription) {
      deletedMessageSubscription.unsubscribe();
      setDeletedMessageSubscription(null);
    }
    
    // Re-fetch messages and re-establish subscriptions
    fetchMessages();
  }, [fetchMessages, newMessageSubscription, deletedMessageSubscription]);

  // Handle mentions
  const markMentionsAsRead = useCallback(async () => {
    if (!channelId || !currentUserId) return;
    
    try {
      await supabase
        .from('message_mentions')
        .update({ read: true })
        .eq('channel_id', channelId)
        .eq('mentioned_user_id', currentUserId);
    } catch (error) {
      console.error('Error marking mentions as read:', error);
    }
  }, [channelId, currentUserId]);

  // React to message
  const reactToMessage = useCallback(async (messageId: string, emoji: string): Promise<void> => {
    if (!channelId || !currentUserId) return;
    
    try {
      const { data: messageData } = await supabase
        .from('chat_messages')
        .select('reactions')
        .eq('id', messageId)
        .single();
      
      let reactions = messageData?.reactions || {};
      
      // Convert to proper format if needed
      if (typeof reactions === 'string') {
        try {
          reactions = JSON.parse(reactions);
        } catch (e) {
          reactions = {};
        }
      }
      
      // Update the reactions
      if (!reactions[emoji]) {
        reactions[emoji] = [currentUserId];
      } else if (!reactions[emoji].includes(currentUserId)) {
        reactions[emoji].push(currentUserId);
      } else {
        reactions[emoji] = reactions[emoji].filter((id: string) => id !== currentUserId);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      }
      
      // Update in database
      await supabase
        .from('chat_messages')
        .update({ reactions })
        .eq('id', messageId);
      
      // Update local state
      setMessages(prev => 
        prev.map(msg => {
          if (msg.id === messageId) {
            return { ...msg, reactions };
          }
          return msg;
        })
      );
      
      // Update cache
      const cachedMessages = getCachedMessages(channelId);
      if (cachedMessages) {
        const updatedCachedMessages = cachedMessages.map(msg => {
          if (msg.id === messageId) {
            return { ...msg, reactions };
          }
          return msg;
        });
        setCachedMessages(channelId, updatedCachedMessages);
      }
    } catch (error) {
      console.error('Error reacting to message:', error);
    }
  }, [channelId, currentUserId, getCachedMessages, setCachedMessages]);

  // Send message implementation
  const sendMessage = useCallback(async (content: string, parentMessageId?: string, attachments: File[] = []) => {
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
    
    // Handle attachments if any
    let optimisticAttachments: Attachment[] = [];
    let uploadedAttachments: Attachment[] = [];
    
    if (attachments.length > 0) {
      // Create optimistic attachments for UI
      optimisticAttachments = attachments.map(file => ({
        url: URL.createObjectURL(file),
        filename: file.name,
        type: file.type,
        size: file.size,
        isOptimistic: true
      }));
      
      // Upload the actual files
      for (const file of attachments) {
        try {
          const fileName = `${uuidv4()}-${file.name}`;
          const { data, error } = await supabase.storage
            .from('chat-attachments')
            .upload(`${channelId}/${fileName}`, file);
          
          if (error) throw error;
          
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(`${channelId}/${fileName}`);
          
          uploadedAttachments.push({
            url: urlData.publicUrl,
            filename: file.name,
            type: file.type,
            size: file.size
          });
        } catch (error) {
          console.error('Error uploading file:', error);
          toast({
            title: "Error",
            description: `Failed to upload ${file.name}`,
            variant: "destructive",
          });
        }
      }
    }
    
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
      attachments: optimisticAttachments,
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
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined
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
      const realMessage = convertMessageData(data as MessageData, senderInfo);
      
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
  const deleteMessage = useCallback(async (messageId: string): Promise<void> => {
    if (!channelId) return;
    
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
      
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
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
    isSubscribed,
    subscriptionStatus,
    currentUserId,
    reactToMessage,
    markMentionsAsRead,
    retry,
    fetchMessages,
    loadMoreMessages,
    hasMore: hasMoreMessages,
    hasMoreMessages,
  };
};
