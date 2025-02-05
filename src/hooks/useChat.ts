import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Message, Attachment } from '@/types/messaging';

interface MessageData {
  id: string;
  content: string;
  sender_id: string;
  channel_id: string;
  created_at: string;
  parent_message_id: string | null;
  reactions: Record<string, string[]>;
  attachments?: Array<{
    url: string;
    filename: string;
    type: string;
    size: number;
  }>;
}

interface SenderDetails {
  id: string;
  name: string;
  avatar_url: string;
}

export const useChat = (channelId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  const formatMessage = async (messageData: MessageData): Promise<Message> => {
    if (!messageData?.id || !messageData?.sender_id) {
      console.error('Missing required message data:', messageData);
      throw new Error('Invalid message data');
    }

    // Get sender details from the database
    const { data: senderDetails, error: senderError } = await supabase
      .rpc('get_message_sender_details', {
        sender_id: messageData.sender_id
      })
      .single();

    if (senderError) {
      console.error('Error fetching sender details:', senderError);
      throw senderError;
    }

    const reactions: Record<string, string[]> = {};
    if (messageData.reactions && typeof messageData.reactions === 'object') {
      Object.entries(messageData.reactions).forEach(([emoji, users]) => {
        if (Array.isArray(users)) {
          reactions[emoji] = users.filter((user): user is string => typeof user === 'string');
        }
      });
    }

    const attachments: Attachment[] = messageData.attachments?.map(att => ({
      url: String(att.url || ''),
      filename: String(att.filename || ''),
      type: String(att.type || ''),
      size: Number(att.size || 0)
    })) || [];

    return {
      id: messageData.id,
      content: messageData.content || '',
      sender: {
        id: messageData.sender_id,
        name: senderDetails?.name || 'Unknown User',
        avatarUrl: senderDetails?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${messageData.sender_id}`
      },
      timestamp: new Date(messageData.created_at),
      parent_message_id: messageData.parent_message_id,
      reactions,
      attachments
    };
  };

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
          const { data: userRole } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', message.sender_id)
            .maybeSingle();

          let senderName = 'Unknown User';
          let avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.sender_id}`;

          if (userRole?.role === 'interpreter') {
            const { data: profile } = await supabase
              .from('interpreter_profiles')
              .select('first_name, last_name, profile_picture_url')
              .eq('id', message.sender_id)
              .maybeSingle();

            if (profile) {
              senderName = `${profile.first_name} ${profile.last_name}`;
              avatarUrl = profile.profile_picture_url || avatarUrl;
            }
          } else {
            const { data: adminProfile } = await supabase
              .from('user_roles')
              .select('user_id')
              .eq('user_id', message.sender_id)
              .eq('role', 'admin')
              .maybeSingle();

            if (adminProfile) {
              const { data: { user } } = await supabase.auth.admin.getUserById(message.sender_id);
              if (user?.user_metadata) {
                senderName = `${user.user_metadata.first_name || ''} ${user.user_metadata.last_name || ''} (Admin)`.trim();
              }
            }
          }

          const formattedMessage = formatMessage({
            ...message,
            sender: {
              id: message.sender_id,
              name: senderName,
              avatarUrl: avatarUrl,
            }
          });

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
      toast({
        title: "Error",
        description: "Failed to load messages. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToMessages = () => {
    console.log('[Chat] Setting up real-time subscription for channel:', channelId);
    
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          console.log('[Chat] Received real-time update:', payload);
          
          if (payload.eventType === 'UPDATE') {
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === payload.new.id 
                  ? {
                      ...msg,
                      reactions: payload.new.reactions || {}
                    }
                  : msg
              )
            );
          } else {
            await fetchMessages();
          }
          
          if (payload.eventType === 'INSERT' && payload.new.sender_id !== currentUserId) {
            toast({
              title: "Nouveau message",
              description: "Un nouveau message a été reçu",
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Chat] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
        } else if (status === 'CHANNEL_ERROR') {
          handleSubscriptionError();
        }
      });

    return channel;
  };

  const subscribeToMentions = () => {
    console.log('[Chat] Setting up mentions subscription');
    
    const channel = supabase
      .channel(`mentions:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_mentions',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          console.log('[Chat] Received mention update:', payload);
          if (payload.eventType === 'INSERT' && payload.new.mentioned_user_id === currentUserId) {
            toast({
              title: "New Mention",
              description: "You were mentioned in a message",
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Chat] Mentions subscription status:', status);
      });

    return channel;
  };

  const handleSubscriptionError = () => {
    if (retryCount < MAX_RETRIES) {
      const timeout = Math.min(1000 * Math.pow(2, retryCount), 10000);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, timeout);
    } else {
      toast({
        title: "Erreur de connexion",
        description: "Impossible de se connecter au chat. Veuillez rafraîchir la page.",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (
    content: string,
    parentMessageId?: string,
    attachments: Attachment[] = []
  ): Promise<string> => {
    if (!channelId || !currentUserId) throw new Error("Missing required data");
    if (!content.trim() && attachments.length === 0) throw new Error("Message cannot be empty");
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: channelId,
          sender_id: currentUserId,
          content: content.trim(),
          parent_message_id: parentMessageId,
          attachments,
          reactions: {}
        })
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error("No data returned from insert");

      await fetchMessages();
      return data.id;

    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Message deleted",
      });
    } catch (error) {
      console.error('[Chat] Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  const reactToMessage = async (messageId: string, emoji: string) => {
    if (!currentUserId) return;

    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const currentReactions = message.reactions || {};
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

      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId
            ? { ...msg, reactions: updatedReactions }
            : msg
        )
      );

      const { error } = await supabase
        .from('chat_messages')
        .update({ reactions: updatedReactions })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('[Chat] Error updating reaction:', error);
      await fetchMessages();
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!channelId) return;
    
    let mentionsChannel: RealtimeChannel;

    const setupSubscriptions = async () => {
      try {
        await fetchMessages();
        const channel = subscribeToMessages();
        mentionsChannel = subscribeToMentions();
        setIsSubscribed(true);
        setRetryCount(0);
      } catch (error) {
        console.error('[Chat] Error setting up subscriptions:', error);
        handleSubscriptionError();
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
