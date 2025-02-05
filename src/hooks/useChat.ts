import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  timestamp: Date;
  parent_message_id?: string;
  reactions: Record<string, string[]>;
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

  const fetchMessages = async () => {
    if (!channelId) return;
    
    setIsLoading(true);
    try {
      console.log('[Chat] Fetching messages for channel:', channelId);
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select(`
          id,
          content,
          created_at,
          sender_id,
          reactions,
          parent_message_id
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const { data: profiles, error: profilesError } = await supabase
        .from('interpreter_profiles')
        .select(`
          id,
          first_name,
          last_name,
          profile_picture_url
        `);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(
        profiles?.map(profile => [profile.id, profile]) || []
      );
      const rolesMap = new Map(
        userRoles?.map(ur => [ur.user_id, ur.role]) || []
      );

      const formattedMessages = await Promise.all(
        messagesData.map(async (message) => {
          const profile = profilesMap.get(message.sender_id);
          const role = rolesMap.get(message.sender_id);
          
          if (!profile && role === 'admin') {
            try {
              const response = await supabase.functions.invoke('get-user-info', {
                body: { userId: message.sender_id }
              });
              
              if (response.error) throw response.error;
              
              const userData = response.data;
              return {
                id: message.id,
                content: message.content,
                sender: {
                  id: message.sender_id,
                  name: `${userData.first_name} ${userData.last_name} (Admin)`,
                },
                timestamp: new Date(message.created_at),
                parent_message_id: message.parent_message_id,
                reactions: message.reactions as Record<string, string[]> || {},
              };
            } catch (error) {
              console.error('[Chat] Error fetching admin info:', error);
              return {
                id: message.id,
                content: message.content,
                sender: {
                  id: message.sender_id,
                  name: 'Admin',
                },
                timestamp: new Date(message.created_at),
                parent_message_id: message.parent_message_id,
                reactions: message.reactions as Record<string, string[]> || {},
              };
            }
          }

          return {
            id: message.id,
            content: message.content,
            sender: {
              id: message.sender_id,
              name: profile ? `${profile.first_name} ${profile.last_name} (Interpreter)` : 'Unknown User',
              avatarUrl: profile?.profile_picture_url,
            },
            timestamp: new Date(message.created_at),
            parent_message_id: message.parent_message_id,
            reactions: message.reactions as Record<string, string[]> || {},
          };
        })
      );

      setMessages(formattedMessages);
    } catch (error) {
      console.error('[Chat] Error fetching messages:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les messages",
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
  }, [channelId, retryCount]);

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

  const sendMessage = async (content: string, parentMessageId?: string, attachments: any[] = []): Promise<string> => {
    if (!channelId || !currentUserId) throw new Error("Missing required data");
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: channelId,
          sender_id: currentUserId,
          content,
          parent_message_id: parentMessageId,
          attachments,
          reactions: {}
        })
        .select('*')
        .single();

      if (error) throw error;

      if (!data) throw new Error("No data returned from insert");

      const newMessage: Message = {
        id: data.id,
        content: data.content,
        sender: {
          id: currentUserId,
          name: 'Admin',
        },
        timestamp: new Date(data.created_at),
        parent_message_id: data.parent_message_id,
        reactions: {},
      };
      
      setMessages(prev => [...prev, newMessage]);
      return data.id;

    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
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
        title: "Succès",
        description: "Message supprimé",
      });
    } catch (error) {
      console.error('[Chat] Error deleting message:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le message",
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
        // Remove reaction
        updatedUsers = currentUsers.filter(id => id !== currentUserId);
      } else {
        // Add reaction
        updatedUsers = [...currentUsers, currentUserId];
      }

      const updatedReactions = {
        ...currentReactions,
        [emoji]: updatedUsers
      };

      // Remove emoji key if no users have reacted
      if (updatedUsers.length === 0) {
        delete updatedReactions[emoji];
      }

      // Optimistically update the UI
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
      // Revert optimistic update on error
      await fetchMessages();
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la réaction",
        variant: "destructive",
      });
    }
  };

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
