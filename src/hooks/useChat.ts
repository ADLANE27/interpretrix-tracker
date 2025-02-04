import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  timestamp: Date;
}

export const useChat = (channelId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!channelId) return;
    
    fetchMessages();
    const cleanup = subscribeToMessages();
    return cleanup;
  }, [channelId]);

  const fetchMessages = async () => {
    if (!channelId) return;
    
    try {
      // First get all messages with sender IDs
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select(`
          id,
          content,
          created_at,
          sender_id
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Then get all user roles to identify user types
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get interpreter profiles for those who have them
      const { data: profiles, error: profilesError } = await supabase
        .from('interpreter_profiles')
        .select(`
          id,
          first_name,
          last_name,
          profile_picture_url
        `);

      if (profilesError) throw profilesError;

      // Create maps for easy lookup
      const profilesMap = new Map(
        profiles?.map(profile => [profile.id, profile]) || []
      );
      const rolesMap = new Map(
        userRoles?.map(ur => [ur.user_id, ur.role]) || []
      );

      // Format messages with sender information
      const formattedMessages: Message[] = await Promise.all(
        messagesData.map(async (message) => {
          const profile = profilesMap.get(message.sender_id);
          const role = rolesMap.get(message.sender_id);

          if (!profile) {
            // For users without interpreter profiles (like admins), fetch basic info
            const response = await supabase.functions.invoke('get-user-info', {
              body: { userId: message.sender_id }
            });
            
            const userData = response.data;
            
            return {
              id: message.id,
              content: message.content,
              sender: {
                id: message.sender_id,
                name: `${userData.first_name} ${userData.last_name} (${role})`,
              },
              timestamp: new Date(message.created_at),
            };
          }

          return {
            id: message.id,
            content: message.content,
            sender: {
              id: message.sender_id,
              name: `${profile.first_name} ${profile.last_name} (${role})`,
              avatarUrl: profile.profile_picture_url,
            },
            timestamp: new Date(message.created_at),
          };
        })
      );

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les messages",
        variant: "destructive",
      });
    }
  };

  const subscribeToMessages = () => {
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
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (content: string) => {
    if (!channelId || !currentUserId) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: channelId,
          sender_id: currentUserId,
          content,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
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
      console.error('Error deleting message:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le message",
        variant: "destructive",
      });
    }
  };

  return {
    messages,
    isLoading,
    sendMessage,
    deleteMessage,
    currentUserId,
  };
};