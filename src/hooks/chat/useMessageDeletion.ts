
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { checkConnection } from './useAttachmentUtils';

export const useMessageDeletion = (
  fetchMessages: () => Promise<void>
) => {
  const { toast } = useToast();

  /**
   * Deletes a message
   */
  const deleteMessage = async (messageId: string, currentUserId: string | null) => {
    // Check for connection before attempting to delete
    if (!checkConnection()) {
      toast({
        title: "Erreur",
        description: "Pas de connexion internet. Veuillez réessayer plus tard.",
        variant: "destructive",
      });
      return;
    }

    // Check for required data
    if (!messageId) {
      toast({
        title: "Erreur", 
        description: "ID de message manquant",
        variant: "destructive"
      });
      return;
    }

    if (!currentUserId) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour supprimer un message",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('[Chat] Attempting to delete message:', messageId);
      
      // First verify the message belongs to the current user, using maybeSingle instead of single
      const { data: message, error: fetchError } = await supabase
        .from('chat_messages')
        .select('sender_id')
        .eq('id', messageId)
        .maybeSingle();

      if (fetchError) {
        console.error('[Chat] Error fetching message for deletion check:', fetchError);
        throw new Error("Impossible de vérifier la propriété du message");
      }

      if (!message) {
        console.error('[Chat] Message not found for deletion:', messageId);
        throw new Error("Message introuvable");
      }

      if (message.sender_id !== currentUserId) {
        console.error('[Chat] Unauthorized deletion attempt:', {
          messageOwnerId: message.sender_id,
          currentUserId
        });
        throw new Error("Vous ne pouvez supprimer que vos propres messages");
      }

      // Proceed with deletion
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        console.error('[Chat] Error during message deletion:', error);
        throw error;
      }

      // Refresh messages list after deletion
      await fetchMessages();
      
      toast({
        title: "Succès",
        description: "Message supprimé avec succès"
      });
    } catch (error) {
      console.error('[Chat] Error deleting message:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error 
          ? error.message 
          : "Impossible de supprimer le message",
        variant: "destructive",
      });
    }
  };

  return { deleteMessage };
};
