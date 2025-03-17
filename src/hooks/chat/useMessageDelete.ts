
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useMessageDelete = (currentUserId: string | null, fetchMessages: () => Promise<void>) => {
  const { toast } = useToast();

  const deleteMessage = async (messageId: string) => {
    try {
      // Verify the message belongs to the current user before deleting
      const { data: message, error: fetchError } = await supabase
        .from('chat_messages')
        .select('sender_id')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;

      if (message.sender_id !== currentUserId) {
        throw new Error('You can only delete your own messages');
      }

      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      // Refresh messages list after deletion
      await fetchMessages();
      
      toast({
        title: "Success",
        description: "Message deleted successfully"
      });
    } catch (error) {
      console.error('[Chat] Error deleting message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  return { deleteMessage };
};
