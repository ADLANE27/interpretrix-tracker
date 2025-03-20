
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
      console.error('[useReactions] Invalid reaction parameters:', { messageId, emoji, currentUserId });
      return;
    }

    try {
      console.log(`[useReactions] Adding/toggling reaction ${emoji} to message ${messageId}`);
      
      // Étape 1: Récupérer les réactions actuelles
      const { data: message, error: fetchError } = await supabase
        .from('chat_messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (fetchError) {
        console.error('[useReactions] Failed to fetch message:', fetchError);
        throw new Error("Impossible de récupérer le message");
      }

      // Étape 2: Analyser et mettre à jour les réactions
      let currentReactions: Record<string, string[]> = {};
      
      if (message?.reactions) {
        if (typeof message.reactions === 'string') {
          try {
            currentReactions = JSON.parse(message.reactions);
          } catch (e) {
            console.error('[useReactions] Failed to parse reactions string:', e);
            currentReactions = {};
          }
        } else if (typeof message.reactions === 'object') {
          currentReactions = message.reactions as Record<string, string[]>;
        }
      }

      console.log('[useReactions] Current reactions before update:', currentReactions);

      // Vérifier si l'utilisateur a déjà réagi avec cet emoji
      const userReactionIndex = currentReactions[emoji]?.findIndex(id => id === currentUserId) ?? -1;
      
      // Toggle la réaction
      if (userReactionIndex >= 0) {
        // Supprimer la réaction
        currentReactions[emoji] = currentReactions[emoji].filter(id => id !== currentUserId);
        // Supprimer les tableaux vides
        if (currentReactions[emoji].length === 0) {
          delete currentReactions[emoji];
        }
      } else {
        // Ajouter la réaction
        if (!currentReactions[emoji]) {
          currentReactions[emoji] = [];
        }
        currentReactions[emoji].push(currentUserId);
      }

      console.log('[useReactions] Updated reactions:', currentReactions);

      // Étape 3: Mettre à jour le message dans la base de données - toujours enregistrer en tant qu'objet JSON
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ 
          reactions: currentReactions,
          // Forcer une mise à jour du timestamp pour déclencher les événements en temps réel
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (updateError) {
        console.error('[useReactions] Failed to update message:', updateError);
        throw updateError;
      }

      console.log('[useReactions] Successfully updated reactions for message:', messageId);
      
      // Étape 4: Mettre à jour l'interface utilisateur avec des données fraîches
      await fetchMessages();
    } catch (error) {
      console.error('[useReactions] Error handling reaction:', error);
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
