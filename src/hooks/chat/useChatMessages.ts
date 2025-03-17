
import { useState, useCallback, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Message } from '@/types/messaging';
import { useMessageFormatting } from './useMessageFormatting';
import { CONNECTION_CONSTANTS } from '@/hooks/supabase-connection/constants';
import { toast } from '@/hooks/use-toast';

export const useChatMessages = (channelId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const { formatSingleMessage, batchFormatMessages } = useMessageFormatting();

  // Used to store channel type for message formatting
  const channelTypeRef = useRef<'group' | 'direct' | null>(null);

  // Set default page size
  const PAGE_SIZE = CONNECTION_CONSTANTS.MESSAGE_FETCH_LIMIT || 30;

  // Add the type guard function
  const isValidChannelType = (type: string): type is 'group' | 'direct' => {
    return type === 'group' || type === 'direct';
  };

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
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors du chargement des messages.",
          variant: "destructive",
        });
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

      // Format messages with our utility
      const validMessages = await batchFormatMessages(messagesData, channelTypeRef.current);

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
  }, [channelId, messages, PAGE_SIZE, batchFormatMessages]);

  const loadMoreMessages = useCallback(() => {
    if (!isLoadingMore && hasMoreMessages) {
      fetchMessages(false);
    }
  }, [fetchMessages, isLoadingMore, hasMoreMessages]);

  const updateMessages = useCallback((newMessages: Message[]) => {
    setMessages(newMessages);
  }, []);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const updateMessage = useCallback((updatedMessage: Message) => {
    setMessages(prev => 
      prev.map(m => m.id === updatedMessage.id ? updatedMessage : m)
    );
  }, []);

  const removeMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMoreMessages,
    loadMoreMessages,
    fetchMessages,
    formatSingleMessage,
    updateMessages,
    addMessage,
    updateMessage,
    removeMessage,
    channelTypeRef
  };
};
