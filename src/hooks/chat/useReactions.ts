
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { checkConnection } from './utils/fileUtils';

export const useReactions = (
  channelId: string,
  currentUserId: string | null,
  fetchMessages: () => Promise<void>
) => {
  const { toast } = useToast();

  const reactToMessage = async (messageId: string, emoji: string) => {
    if (!checkConnection()) {
      toast({
        title: "Erreur",
        description: "Pas de connexion internet. Veuillez réessayer plus tard.",
        variant: "destructive",
      });
      return;
    }

    if (!messageId || !emoji || !currentUserId) {
      console.error('Invalid reaction parameters:', { messageId, emoji, currentUserId });
      return;
    }

    try {
      // Get the current reactions
      const { data: message, error: fetchError } = await supabase
        .from('chat_messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (fetchError) throw new Error("Impossible de récupérer le message");

      // Initialize or parse reactions
      let currentReactions: Record<string, string[]> = {};
      
      if (message?.reactions) {
        if (typeof message.reactions === 'string') {
          try {
            currentReactions = JSON.parse(message.reactions);
          } catch (e) {
            currentReactions = {};
          }
        } else if (typeof message.reactions === 'object') {
          currentReactions = message.reactions as Record<string, string[]>;
        }
      }

      // Check if user already reacted with this emoji
      const userReactionIndex = currentReactions[emoji]?.findIndex(id => id === currentUserId) ?? -1;
      
      // Toggle the reaction
      if (userReactionIndex >= 0) {
        // Remove the reaction
        currentReactions[emoji] = currentReactions[emoji].filter(id => id !== currentUserId);
        // Remove empty arrays
        if (currentReactions[emoji].length === 0) {
          delete currentReactions[emoji];
        }
      } else {
        // Add the reaction
        if (!currentReactions[emoji]) {
          currentReactions[emoji] = [];
        }
        currentReactions[emoji].push(currentUserId);
      }

      // Update the message in the database - always save as object, not JSON string
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ reactions: currentReactions })
        .eq('id', messageId);

      if (updateError) throw updateError;

      // Update the UI with fresh data
      await fetchMessages();
    } catch (error) {
      console.error('Error handling reaction:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error 
          ? error.message 
          : "Impossible d'ajouter la réaction",
        variant: "destructive",
      });
      throw error;
    }
  };

  return { reactToMessage };
};
