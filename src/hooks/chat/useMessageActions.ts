
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Attachment } from '@/types/messaging';

export const useMessageActions = (
  channelId: string,
  currentUserId: string | null,
  fetchMessages: () => Promise<void>
) => {
  const { toast } = useToast();

  const sendMessage = async (
    content: string,
    parentMessageId?: string,
    attachments: Attachment[] = []
  ): Promise<string> => {
    if (!channelId || !currentUserId) throw new Error("Missing required data");
    if (!content.trim() && attachments.length === 0) throw new Error("Message cannot be empty");
    
    const newMessage = {
      channel_id: channelId,
      sender_id: currentUserId,
      content: content.trim(),
      parent_message_id: parentMessageId,
      attachments: attachments.map(att => ({
        url: att.url,
        filename: att.filename,
        type: att.type,
        size: att.size
      })),
      reactions: {}
    };

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert(newMessage)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error("No data returned from insert");

      // No need to fetch all messages, just update the local state
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

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('[Chat] Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  const markMentionsAsRead = async () => {
    if (!currentUserId || !channelId) return;

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
    if (!currentUserId) return;

    try {
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (!messages) return;

      const currentReactions = messages.reactions as Record<string, string[]> || {};
      const currentUsers = currentReactions[emoji] || [];
      
      let updatedUsers;
      if (currentUsers.includes(currentUserId)) {
        updatedUsers = currentUsers.filter(id => id !== currentUserId);
      } else {
        updatedUsers = [...currentUsers, currentUserId];
      }

      const updatedReactions = {
        ...currentReactions,
        [emoji]: updatedUsers
      };

      if (updatedUsers.length === 0) {
        delete updatedReactions[emoji];
      }

      const { error } = await supabase
        .from('chat_messages')
        .update({ reactions: updatedReactions })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('[Chat] Error updating reaction:', error);
      toast({
        title: "Error",
        description: "Failed to update reaction",
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
