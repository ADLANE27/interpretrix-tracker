
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { checkConnection } from './utils/fileUtils';
import type { Json } from '@/integrations/supabase/types';

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
      console.error('[Chat] Invalid reaction parameters:', { messageId, emoji, currentUserId });
      return;
    }

    try {
      console.log('[Chat] Adding/toggling reaction:', { messageId, emoji, userId: currentUserId });
      
      // Récupérer d'abord le message pour obtenir les réactions actuelles
      const { data: message, error: fetchError } = await supabase
        .from('chat_messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (fetchError) {
        console.error('[Chat] Error fetching message for reaction:', fetchError);
        throw new Error("Impossible de récupérer le message");
      }

      // Initialiser ou parser les réactions actuelles
      let currentReactions: Record<string, string[]> = {};
      
      if (message?.reactions) {
        if (typeof message.reactions === 'string') {
          try {
            currentReactions = JSON.parse(message.reactions);
          } catch (e) {
            console.error('[Chat] Error parsing reactions string:', e);
            currentReactions = {};
          }
        } else if (typeof message.reactions === 'object') {
          currentReactions = message.reactions as Record<string, string[]>;
        }
      }

      console.log('[Chat] Current reactions before update:', currentReactions);

      // Vérifier si l'utilisateur a déjà ajouté cette réaction
      const hasReacted = currentReactions[emoji]?.includes(currentUserId);
      
      // Mettre à jour les réactions
      if (hasReacted) {
        // Retirer la réaction
        currentReactions[emoji] = (currentReactions[emoji] || []).filter(id => id !== currentUserId);
        // Supprimer l'entrée si plus de réactions
        if (currentReactions[emoji].length === 0) {
          delete currentReactions[emoji];
        }
        console.log('[Chat] Removing reaction:', { emoji, userId: currentUserId });
      } else {
        // Ajouter la réaction
        if (!currentReactions[emoji]) {
          currentReactions[emoji] = [];
        }
        currentReactions[emoji].push(currentUserId);
        console.log('[Chat] Adding reaction:', { emoji, userId: currentUserId });
      }

      console.log('[Chat] Updated reactions to save:', currentReactions);

      // Mettre à jour le message dans la base de données
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ reactions: currentReactions as Json })
        .eq('id', messageId);

      if (updateError) {
        console.error('[Chat] Error updating message reactions:', updateError);
        throw updateError;
      }

      // Mettre à jour l'UI
      await fetchMessages();
      console.log('[Chat] Reaction saved successfully, UI refresh requested');

    } catch (error) {
      console.error('[Chat] Error handling reaction:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error 
          ? error.message 
          : "Impossible d'ajouter la réaction",
        variant: "destructive",
      });
    }
  };

  return { reactToMessage };
};
