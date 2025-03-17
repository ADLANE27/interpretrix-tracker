
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAttachmentUpload } from './useAttachmentUpload';
import type { Json } from '@/integrations/supabase/types';

export const useMessageSend = (
  channelId: string, 
  currentUserId: string | null,
  fetchMessages: () => Promise<void>
) => {
  const { toast } = useToast();
  const { uploadAttachment } = useAttachmentUpload();

  const sendMessage = async (
    content: string,
    parentMessageId?: string | null,
    files: File[] = []
  ): Promise<string> => {
    if (!channelId || !currentUserId) throw new Error("Missing required data");
    if (!content.trim() && files.length === 0) throw new Error("Message cannot be empty");
    
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

      // Check if connection is available before attempting to send
      const isOnline = window.navigator.onLine;
      if (!isOnline) {
        throw new Error("Network connection unavailable");
      }

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(newMessage)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error("No data returned from insert");

      await fetchMessages();
      return data.id;
    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
      throw error;
    }
  };

  return { sendMessage };
};
