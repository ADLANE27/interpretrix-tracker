import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Message, MessageData, Attachment, isAttachment } from '@/types/messaging';
import { useMessageFormatter } from './chat/useMessageFormatter';
import { useSubscriptions } from './chat/useSubscriptions';
import { useMessageActions } from './chat/useMessageActions';
import { useToast } from './use-toast';

function isValidChannelType(type: string): type is 'group' | 'direct' {
  return type === 'group' || type === 'direct';
}

export const useChat = (channelId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    messages: boolean;
    mentions: boolean;
  }>({ messages: false, mentions: false });

  const { toast } = useToast();
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

      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

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
      
      formattedMessages.push(...validMessages);
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
    (payload) => {
      // Handle real-time updates directly
      const handleRealtimeMessage = async (payload: any) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        try {
          switch (eventType) {
            case 'INSERT':
              const formattedMessage = await formatMessage(newRecord);
              if (formattedMessage) {
                setMessages(prev => [...prev, formattedMessage]);
              }
              break;

            case 'DELETE':
              setMessages(prev => prev.filter(msg => msg.id !== oldRecord.id));
              break;

            case 'UPDATE':
              const updatedMessage = await formatMessage(newRecord);
              if (updatedMessage) {
                setMessages(prev => prev.map(msg => 
                  msg.id === updatedMessage.id ? updatedMessage : msg
                ));
              }
              break;
          }
        } catch (error) {
          console.error('[Chat] Error handling realtime message:', error);
        }
      }
      
      handleRealtimeMessage(payload);
    }
  );

  const optimisticSendMessage = async (content: string, replyToId: string | null | undefined, attachments: File[]) => {
    if (!currentUserId) return null;

    const timestamp = new Date();
    const optimisticId = `temp-${timestamp.getTime()}`;

    const optimisticMessage: Message = {
      id: optimisticId,
      content,
      sender: {
        id: currentUserId,
        name: 'You', // This will be replaced when the real message arrives
        avatarUrl: ''
      },
      timestamp,
      channelType: 'group',
      attachments: []
    };

    // Add optimistic message
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      await sendMessageToChannel(content, replyToId, attachments);
      // Don't remove the optimistic message here - let the real-time update handle it
    } catch (error) {
      // Only remove the optimistic message if there's an error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticId));
      throw error;
    }
  };

  const optimisticDeleteMessage = async (messageId: string) => {
    // Remove message optimistically
    setMessages(prev => prev.filter(msg => msg.id !== messageId));

    try {
      await deleteMessage(messageId);
    } catch (error) {
      // Restore message on error
      const deletedMessage = messages.find(msg => msg.id === messageId);
      if (deletedMessage) {
        setMessages(prev => [...prev, deletedMessage]);
      }
      throw error;
    }
  };

  const { 
    sendMessage: sendMessageToChannel,
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
      console.log('[Chat] Initial messages fetch for channel:', channelId);
      fetchMessages();
    }
  }, [channelId, fetchMessages]);

  useEffect(() => {
    setSubscriptionStatus({
      messages: subscriptionStates.messages?.status === 'SUBSCRIBED',
      mentions: subscriptionStates.mentions?.status === 'SUBSCRIBED'
    });
  }, [subscriptionStates]);

  useEffect(() => {
    if (channelId) {
      const channel = supabase.channel(`chat-${channelId}`)
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_messages',
            filter: `channel_id=eq.${channelId}`
          },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              const formattedMessage = await formatMessage(payload.new);
              if (formattedMessage) {
                setMessages(prev => {
                  // Remove any optimistic message with matching content and replace with real message
                  const withoutOptimistic = prev.filter(msg => 
                    !(msg.id.startsWith('temp-') && msg.content === formattedMessage.content)
                  );
                  return [...withoutOptimistic, formattedMessage];
                });
              }
            } else if (payload.eventType === 'DELETE') {
              setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
            }
          })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [channelId]);

  return {
    messages,
    isLoading,
    isSubscribed: subscriptionStatus.messages && subscriptionStatus.mentions,
    subscriptionStatus,
    sendMessage: optimisticSendMessage,
    deleteMessage: optimisticDeleteMessage,
    currentUserId,
    reactToMessage,
    markMentionsAsRead,
  };
};
