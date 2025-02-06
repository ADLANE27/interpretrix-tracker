import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Message, MessageData, Attachment, isAttachment } from '@/types/messaging';
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
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(50);

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
            attachments: parsedAttachments
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
  };

  const { subscribeToMessages, subscribeToMentions } = useSubscriptions(
    channelId,
    currentUserId,
    retryCount,
    setRetryCount,
    fetchMessages
  );

  const handleDeleteMessage = async (messageId: string) => {
    try {
      // Optimistic update - remove message from local state immediately
      setMessages(prev => prev.filter(msg => msg.id !== messageId));

      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        // If deletion fails, revert the optimistic update
        console.error('[Chat] Error deleting message:', error);
        await fetchMessages();
        throw error;
      }
    } catch (error) {
      console.error('[Chat] Error deleting message:', error);
    }
  };

  const { sendMessage, reactToMessage } = useMessageActions(
    channelId,
    currentUserId,
    fetchMessages
  );

  const sendMessage = async (
    content: string,
    parentMessageId?: string,
    attachments: Attachment[] = []
  ): Promise<string> => {
    if (!channelId || !currentUserId) throw new Error("Missing required data");
    if (!content.trim() && attachments.length === 0) throw new Error("Message cannot be empty");
    
    const newMessage = {
      channel_id: channelId,
      sender_id: currentUserId,
      content: content.trim(),
      parent_message_id: parentMessageId,
      attachments: attachments.map(att => ({
        url: att.url,
        filename: att.filename,
        type: att.type,
        size: att.size
      })),
      reactions: {}
    };

    try {
      const { data: messageData, error: messageError } = await supabase
        .from('chat_messages')
        .insert(newMessage)
        .select('*')
        .single();

      if (messageError) throw messageError;
      if (!messageData) throw new Error("No data returned from insert");

      // Handle mentions
      const mentionRegex = /@([a-zA-Z\s]+)/g;
      const mentions = content.match(mentionRegex);

      if (mentions) {
        const { data: members } = await supabase
          .rpc('get_channel_members', { channel_id: channelId });

        if (members) {
          for (const mention of mentions) {
            const name = mention.substring(1).trim();
            const mentionedMember = members.find(member => 
              `${member.first_name} ${member.last_name}`.toLowerCase() === name.toLowerCase()
            );

            if (mentionedMember) {
              await supabase.from('message_mentions').insert({
                channel_id: channelId,
                message_id: messageData.id,
                mentioned_user_id: mentionedMember.user_id,
              });
            }
          }
        }
      }

      await fetchMessages();
      return messageData.id;
    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      throw error;
    }
  };

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
    deleteMessage: handleDeleteMessage,
    currentUserId,
    reactToMessage,
  };
};
