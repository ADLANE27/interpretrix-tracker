import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message, Attachment, isAttachment } from '@/types/messaging';
import { useMessageFormatter } from './chat/useMessageFormatter';
import { useSubscriptions } from './chat/useSubscriptions';
import { useMessageActions } from './chat/useMessageActions';
import { useToast } from '@/hooks/use-toast';

export const useChat = (channelId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

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
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      const formattedMessages: Message[] = [];
      for (const message of messagesData || []) {
        try {
          const { data: senderData, error: senderError } = await supabase
            .rpc('get_message_sender_details', {
              sender_id: message.sender_id
            });

          if (senderError) {
            console.error('[Chat] Error fetching sender details:', senderError);
            continue;
          }

          const sender = senderData?.[0] || {
            id: message.sender_id,
            name: 'Unknown User',
            avatar_url: ''
          };

          let parsedReactions: Record<string, string[]> = {};
          try {
            if (typeof message.reactions === 'string') {
              parsedReactions = JSON.parse(message.reactions);
            } else if (message.reactions && typeof message.reactions === 'object') {
              Object.entries(message.reactions).forEach(([emoji, users]) => {
                if (Array.isArray(users)) {
                  parsedReactions[emoji] = users.map(String);
                }
              });
            }
          } catch (e) {
            console.error('[Chat] Error parsing reactions:', e);
            parsedReactions = {};
          }

          const parsedAttachments: Attachment[] = [];
          if (Array.isArray(message.attachments)) {
            for (const att of message.attachments) {
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
            }
          }

          const formattedMessage: Message = {
            id: message.id,
            content: message.content,
            sender: {
              id: sender.id,
              name: sender.name,
              avatarUrl: sender.avatar_url
            },
            timestamp: new Date(message.created_at),
            parent_message_id: message.parent_message_id,
            reactions: parsedReactions,
            attachments: parsedAttachments
          };

          formattedMessages.push(formattedMessage);
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

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete message",
          variant: "destructive",
        });
        throw error;
      }

      // Update local state immediately after successful deletion
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
      
      toast({
        title: "Success",
        description: "Message deleted successfully",
      });
    } catch (error) {
      console.error('[Chat] Error deleting message:', error);
    }
  };

  const { sendMessage, reactToMessage } = useMessageActions(
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
    deleteMessage: handleDeleteMessage,
    currentUserId,
    reactToMessage,
  };
};