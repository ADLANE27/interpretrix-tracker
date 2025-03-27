
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAttachmentUpload } from './useAttachmentUpload';
import { checkConnection } from './useAttachmentUtils';
import type { Json } from '@/integrations/supabase/types';

export const useMessageSend = (
  channelId: string,
  currentUserId: string | null,
  fetchMessages: () => Promise<void>
) => {
  const { toast } = useToast();
  const { uploadAttachment } = useAttachmentUpload();

  /**
   * Sends a new message to the channel
   */
  const sendMessage = async (
    content: string,
    parentMessageId?: string | null,
    files: File[] = []
  ): Promise<string> => {
    if (!channelId || !currentUserId) throw new Error("Données requises manquantes");
    if (!content.trim() && files.length === 0) throw new Error("Le message ne peut pas être vide");
    
    // Check connection before attempting to send
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
        content: content.trim(), // The server-side trigger will handle the mentions
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

  return { sendMessage };
};
