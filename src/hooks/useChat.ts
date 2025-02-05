import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/messaging';
import { useMessageFormatter } from './chat/useMessageFormatter';
import { useSubscriptions } from './chat/useSubscriptions';
import { useMessageActions } from './chat/useMessageActions';

export const useChat = (channelId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const { formatMessage } = useMessageFormatter();

  const fetchMessages = async () => {
    if (!channelId) return;
    
    setIsLoading(true);
    try {
      console.log('[Chat] Fetching messages for channel:', channelId);
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!inner(
            id,
            email,
            raw_user_meta_data
          )
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      const formattedMessages: Message[] = [];

      for (const message of messagesData || []) {
        try {
          const formattedMessage = await formatMessage(message);
          if (formattedMessage) {
            formattedMessages.push(formattedMessage);
          }
        } catch (error) {
          console.error('[Chat] Error formatting message:', error, message);
        }
      }

      setMessages(formattedMessages);
    } catch (error) {
      console.error('[Chat] Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const { subscribeToMessages, subscribeToMentions } = useSubscriptions(
    channelId,
    currentUserId,
    retryCount,
    setRetryCount,
    fetchMessages
  );

  const { sendMessage, deleteMessage, reactToMessage } = useMessageActions(
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
    if (!channelId) return;
    
    let mentionsChannel;

    const setupSubscriptions = async () => {
      try {
        await fetchMessages();
        subscribeToMessages();
        mentionsChannel = subscribeToMentions();
        setIsSubscribed(true);
        setRetryCount(0);
      } catch (error) {
        console.error('[Chat] Error setting up subscriptions:', error);
      }
    };

    setupSubscriptions();

    return () => {
      if (mentionsChannel) {
        console.log('[Chat] Cleaning up mentions subscription');
        supabase.removeChannel(mentionsChannel);
      }
    };
  }, [channelId]);

  return {
    messages,
    isLoading,
    isSubscribed,
    sendMessage,
    deleteMessage,
    currentUserId,
    reactToMessage,
  };
};