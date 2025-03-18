
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Message, MessageData, Attachment, isAttachment } from '@/types/messaging';
import { useMessageFormatter } from './chat/useMessageFormatter';
import { useSubscriptions } from './chat/useSubscriptions';
import { useMessageActions } from './chat/useMessageActions';

// Add the type guard function at the top of the file
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

  // Add a message cache to prevent duplicate messages
  const messageCache = useRef<Set<string>>(new Set());

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

      // Modified query to fetch messages in descending order by creation date
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false });  // Changed to descending order

      if (messagesError) {
        console.error('[Chat] Error fetching messages:', messagesError);
        throw messagesError;
      }

      console.log('[Chat] Retrieved messages:', messagesData?.length);

      // Reset message cache on fresh fetch
      messageCache.current.clear();
      
      const formattedMessages: Message[] = [];
      const senderDetailsPromises = messagesData?.map(async (message) => {
        // Skip if this message is already in our cache
        if (messageCache.current.has(message.id)) {
          return null;
        }
        
        // Add to cache
        messageCache.current.add(message.id);
        
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
            channelType: channelType,
            parent_message_id: message.parent_message_id
          };

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
      
      // Add messages in reversed order to have newest messages last (for correct display)
      // Also sort by timestamp to ensure consistent ordering
      formattedMessages.push(...validMessages
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
      setMessages(formattedMessages);
    } catch (error) {
      console.error('[Chat] Error fetching messages:', error);
    } finally {
      setIsLoading(false);
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
    fetchMessages // Pass fetchMessages to ensure it's called when subscription receives updates
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
      // Clear the message cache when changing channels
      messageCache.current.clear();
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
