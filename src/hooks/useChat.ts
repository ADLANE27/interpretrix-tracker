
import { useState, useEffect, useCallback } from 'react';
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

  const { formatMessage } = useMessageFormatter();

  // Enhanced subscription system
  const { 
    subscriptionStates, 
    handleSubscriptionError,
    onlineUsers,
    hasConnectivityIssue
  } = useSubscriptions(
    channelId,
    currentUserId,
    retryCount,
    setRetryCount,
    fetchMessages // Pass fetchMessages to ensure it's called when subscription receives updates
  );

  // Enhanced message actions with pending messages support
  const { 
    sendMessage,
    deleteMessage: handleDeleteMessage,
    reactToMessage,
    markMentionsAsRead,
    pendingMessages,
    uploadProgress,
    clearFailedMessages
  } = useMessageActions(
    channelId,
    currentUserId,
    fetchMessages,
    hasConnectivityIssue
  );

  // Fetch messages with enhanced error handling and pagination
  async function fetchMessages() {
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

      if (channelError) {
        console.error('[Chat] Error fetching channel data:', channelError);
        throw channelError;
      }

      if (!channelData?.channel_type || !isValidChannelType(channelData.channel_type)) {
        throw new Error('Invalid channel type');
      }

      const channelType = channelData.channel_type as 'group' | 'direct';

      // Modified query to remove the limit but add ordering
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('[Chat] Error fetching messages:', messagesError);
        throw messagesError;
      }

      console.log('[Chat] Retrieved messages:', messagesData?.length);

      // Use batch processing for sender details for better performance
      if (!messagesData?.length) {
        setMessages([]);
        return;
      }
      
      const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
      
      // Fetch all sender details in one batch
      const { data: senderBatchData, error: senderBatchError } = await supabase
        .rpc('batch_get_message_sender_details', {
          p_sender_ids: senderIds
        });
        
      if (senderBatchError) {
        console.error('[Chat] Error fetching sender batch details:', senderBatchError);
        throw senderBatchError;
      }
      
      // Create a map of sender details for quick lookup
      const senderMap = new Map();
      senderBatchData?.forEach(sender => {
        senderMap.set(sender.id, sender);
      });

      // Process messages with sender data from the map
      const formattedMessages = messagesData.map(message => {
        try {
          const sender = senderMap.get(message.sender_id);
          
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
            parent_message_id: message.parent_message_id,
            reactions: parsedReactions,
            attachments: parsedAttachments,
            channelType: channelType
          };

          return formattedMessage;
        } catch (error) {
          console.error('[Chat] Error formatting message:', error, message);
          return null;
        }
      }).filter((msg): msg is Message => 
        msg !== null && 
        typeof msg === 'object' &&
        typeof msg.id === 'string' &&
        typeof msg.content === 'string' &&
        typeof msg.sender === 'object' &&
        typeof msg.sender.id === 'string' &&
        typeof msg.sender.name === 'string' &&
        msg.timestamp instanceof Date
      );
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('[Chat] Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  }

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
      fetchMessages();
    }
  }, [channelId]);

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
    onlineUsers,
    hasConnectivityIssue,
    pendingMessages,
    uploadProgress,
    clearFailedMessages
  };
};
