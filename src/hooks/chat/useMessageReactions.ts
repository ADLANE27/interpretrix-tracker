
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { checkConnection } from './useAttachmentUtils';

export const useMessageReactions = () => {
  const { toast } = useToast();

  /**
   * Updates a reaction to a message
   */
  const reactToMessage = async (messageId: string, emoji: string, currentUserId: string | null) => {
    if (!currentUserId) return;

    // Check connection before attempting to react
    if (!checkConnection()) {
      toast({
        title: "Erreur",
        description: "Pas de connexion internet. Veuillez réessayer plus tard.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use maybeSingle instead of single for better error handling
      const { data: messages, error: fetchError } = await supabase
        .from('chat_messages')
        .select('reactions')
        .eq('id', messageId)
        .maybeSingle();

      if (fetchError) {
        console.error('[Chat] Error fetching message for reaction:', fetchError);
        throw fetchError;
      }

      if (!messages) {
        console.error('[Chat] Message not found for reaction:', messageId);
        throw new Error("Message introuvable");
      }

      const currentReactions = messages.reactions as Record<string, string[]> || {};
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

      const { error } = await supabase
        .from('chat_messages')
        .update({ reactions: updatedReactions })
        .eq('id', messageId);

      if (error) {
        console.error('[Chat] Error updating reaction:', error);
        throw error;
      }
    } catch (error) {
      console.error('[Chat] Error updating reaction:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la réaction",
        variant: "destructive",
      });
    }
  };

  /**
   * Marks mentions of the current user as read
   */
  const markMentionsAsRead = async (currentUserId: string | null, channelId: string) => {
    if (!currentUserId || !channelId) return;

    // Check connection before attempting to update mentions
    if (!checkConnection()) {
      console.error('[Chat] Cannot mark mentions as read: No internet connection');
      return;
    }

    try {
      const { error } = await supabase
        .from('message_mentions')
        .update({ status: 'read' })
        .eq('mentioned_user_id', currentUserId)
        .eq('channel_id', channelId)
        .eq('status', 'unread');

      if (error) {
        console.error('[Chat] Error marking mentions as read:', error);
      }
    } catch (error) {
      console.error('[Chat] Error marking mentions as read:', error);
    }
  };

  return { reactToMessage, markMentionsAsRead };
};
