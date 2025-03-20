
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
      
      // Step 1: Fetch current reactions
      const { data: message, error: fetchError } = await supabase
        .from('chat_messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (fetchError) {
        console.error('[useReactions] Failed to fetch message:', fetchError);
        throw new Error("Impossible de récupérer le message");
      }

      // Step 2: Parse and update reactions
      let currentReactions: Record<string, string[]> = {};
      
      if (message?.reactions) {
        // Handle reactions as string or object
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

      // Check if user already reacted with this emoji
      const userReactionIndex = currentReactions[emoji]?.findIndex(id => id === currentUserId) ?? -1;
      
      // Toggle reaction
      if (userReactionIndex >= 0) {
        // Remove reaction
        currentReactions[emoji] = currentReactions[emoji].filter(id => id !== currentUserId);
        // Remove empty arrays
        if (currentReactions[emoji].length === 0) {
          delete currentReactions[emoji];
        }
      } else {
        // Add reaction
        if (!currentReactions[emoji]) {
          currentReactions[emoji] = [];
        }
        currentReactions[emoji].push(currentUserId);
      }

      console.log('[useReactions] Updated reactions:', currentReactions);

      // Step 3: Update message in database
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ 
          reactions: currentReactions,
          // Force update timestamp to trigger realtime events
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (updateError) {
        console.error('[useReactions] Failed to update message:', updateError);
        throw updateError;
      }

      console.log('[useReactions] Successfully updated reactions for message:', messageId);
      
      // Force refresh to ensure UI is updated with current data
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
