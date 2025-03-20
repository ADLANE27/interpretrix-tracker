
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { checkConnection } from './utils/fileUtils';
import { useAttachments } from './useAttachments';
import type { Json } from '@/integrations/supabase/types';

export const useMessageOperations = (
  channelId: string,
  currentUserId: string | null,
  fetchMessages: () => Promise<void>
) => {
  const { toast } = useToast();
  const { uploadAttachment } = useAttachments();

  const sendMessage = async (
    content: string,
    parentMessageId?: string | null,
    files: File[] = []
  ): Promise<string> => {
    if (!channelId || !currentUserId) throw new Error("Données requises manquantes");
    if (!content.trim() && files.length === 0) throw new Error("Le message ne peut pas être vide");
    
    if (!checkConnection()) {
      toast({
        title: "Erreur",
        description: "Pas de connexion internet. Veuillez réessayer plus tard.",
        variant: "destructive",
      });
      throw new Error("Pas de connexion internet. Veuillez réessayer plus tard.");
    }
    
    try {
      console.log('[Chat] Starting file uploads:', files.length);
      const uploadedAttachments = await Promise.all(
        files.map(file => uploadAttachment(file))
      );
      console.log('[Chat] All files uploaded successfully');

      const attachmentsForDb = uploadedAttachments.map(att => ({
        ...att
      })) as unknown as Json[];

      const newMessage = {
        channel_id: channelId,
        sender_id: currentUserId,
        content: content.trim(),
        parent_message_id: parentMessageId,
        attachments: attachmentsForDb,
        reactions: {} as Json
      };

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(newMessage)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error("Aucune donnée retournée lors de l'insertion");

      await fetchMessages();
      return data.id;
    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec de l'envoi du message",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!checkConnection()) {
      toast({
        title: "Erreur",
        description: "Pas de connexion internet. Veuillez réessayer plus tard.",
        variant: "destructive",
      });
      return;
    }

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

      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        console.error('[Chat] Error during message deletion:', error);
        throw error;
      }

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

  return { sendMessage, deleteMessage };
};
