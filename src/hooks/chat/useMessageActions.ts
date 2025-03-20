import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Attachment } from '@/types/messaging';
import type { Json } from '@/integrations/supabase/types';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit
const ALLOWED_FILE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const sanitizeFilename = (filename: string): string => {
  // Create a mapping of accented characters to their non-accented equivalents
  const accentMap: { [key: string]: string } = {
    'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
    'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
    'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
    'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
    'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
    'ý': 'y', 'ÿ': 'y',
    'ñ': 'n',
    'ç': 'c'
  };

  // Extract extension
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  // Process the name without extension
  let nameWithoutExt = filename.slice(0, -(ext.length + 1)).toLowerCase();
  
  // Replace accented characters
  nameWithoutExt = nameWithoutExt.split('').map(char => accentMap[char] || char).join('');
  
  // Remove any remaining non-alphanumeric characters
  nameWithoutExt = nameWithoutExt
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    || 'file';

  // Add uniqueness with timestamp and random string
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 6);
  
  // Clean extension and construct final filename
  const cleanExt = ext.replace(/[^a-z0-9]/g, '');

  const finalName = `${nameWithoutExt}_${timestamp}_${randomString}.${cleanExt}`;
  
  console.log('[Chat] Filename sanitization:', {
    original: filename,
    sanitized: finalName
  });

  return finalName;
};

const validateFile = (file: File): string | null => {
  if (!file) return 'No file provided';
  if (file.size > MAX_FILE_SIZE) return 'File is too large (max 100MB)';
  if (!ALLOWED_FILE_TYPES.has(file.type)) return 'File type not supported';
  return null;
};

// Check if we have an internet connection
const checkConnection = (): boolean => {
  return navigator.onLine;
};

const useMessageActions = (
  channelId: string,
  currentUserId: string | null,
  fetchMessages: () => Promise<void>
) => {
  const { toast } = useToast();

  const uploadAttachment = async (file: File): Promise<Attachment> => {
    // Check connection before attempting upload
    if (!checkConnection()) {
      throw new Error("Pas de connexion internet. Veuillez réessayer plus tard.");
    }

    // Validate file before upload
    const validationError = validateFile(file);
    if (validationError) {
      console.error('[Chat] File validation error:', validationError);
      throw new Error(validationError);
    }

    const sanitizedFilename = sanitizeFilename(file.name);
    console.log('[Chat] Uploading file with sanitized name:', sanitizedFilename);
    
    let retries = 3;
    while (retries > 0) {
      try {
        const { data, error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(sanitizedFilename, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('[Chat] Upload error:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(sanitizedFilename);

        console.log('[Chat] Upload successful:', {
          originalName: file.name,
          sanitizedName: sanitizedFilename,
          publicUrl
        });

        return {
          url: publicUrl,
          filename: file.name, // Keep original filename for display
          type: file.type,
          size: file.size
        };
      } catch (error) {
        console.error(`[Chat] Upload attempt ${4 - retries} failed:`, error);
        retries--;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
      }
    }
    throw new Error('Upload failed after all retries');
  };

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

      // Proceed with deletion inside a transaction to ensure consistency
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

  const markMentionsAsRead = async () => {
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

  const reactToMessage = async (messageId: string, emoji: string) => {
    if (!currentUserId) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour réagir à un message",
        variant: "destructive",
      });
      return;
    }

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
      console.log('[Chat] Adding/removing reaction:', { messageId, emoji, currentUserId });
      
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

      // Initialize reactions as an empty object if it's null or undefined
      const currentReactions = (messages.reactions as Record<string, string[]>) || {};
      console.log('[Chat] Current reactions:', currentReactions);
      
      const currentUsers = currentReactions[emoji] || [];
      
      let updatedUsers;
      if (currentUsers.includes(currentUserId)) {
        // Remove user's reaction if they already reacted with this emoji
        updatedUsers = currentUsers.filter(id => id !== currentUserId);
        console.log('[Chat] Removing user reaction');
      } else {
        // Add user's reaction
        updatedUsers = [...currentUsers, currentUserId];
        console.log('[Chat] Adding user reaction');
      }

      const updatedReactions = {
        ...currentReactions,
        [emoji]: updatedUsers
      };

      // If no users are left for this emoji, remove it from reactions
      if (updatedUsers.length === 0) {
        delete updatedReactions[emoji];
      }

      console.log('[Chat] Updated reactions:', updatedReactions);

      const { error } = await supabase
        .from('chat_messages')
        .update({ reactions: updatedReactions })
        .eq('id', messageId);

      if (error) {
        console.error('[Chat] Error updating reaction:', error);
        throw error;
      }
      
      console.log('[Chat] Reaction updated successfully');
      
      // Refresh messages to reflect the changes
      await fetchMessages();
    } catch (error) {
      console.error('[Chat] Error updating reaction:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la réaction",
        variant: "destructive",
      });
    }
  };

  return {
    sendMessage,
    deleteMessage,
    reactToMessage,
    markMentionsAsRead,
  };
};

export { useMessageActions };
