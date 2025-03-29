import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Attachment } from '@/types/messaging';

export const useMessageActions = (
  channelId: string,
  currentUserId: string | null,
  fetchMessages: (offset: number, limit: number) => Promise<void>
) => {
  const [isUploading, setIsUploading] = useState(false);

  const sendMessage = async (content: string, parentMessageId?: string, files?: File[]) => {
    if (!currentUserId || !channelId) {
      throw new Error("User or channel ID not available");
    }

    try {
      setIsUploading(true);
      const attachments: Attachment[] = [];

      if (files && files.length > 0) {
        for (const file of files) {
          const fileName = file.name;
          const fileExtension = fileName.split('.').pop() || '';
          const filePath = `attachments/${channelId}/${Date.now()}_${fileName}`;
          
          const { data, error } = await supabase.storage
            .from('chat')
            .upload(filePath, file);
            
          if (error) {
            console.error("Error uploading file:", error);
            continue;
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('chat')
            .getPublicUrl(filePath);
          
          attachments.push({
            id: `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
            url: publicUrl,
            name: fileName,
            type: file.type,
            size: file.size
          });
        }
      }

      // Extract mentions from content
      const mentionRegex = /@(\w+)/g;
      const mentions = content.match(mentionRegex) || [];
      
      // Create the message
      const { data: messageData, error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          content,
          sender_id: currentUserId,
          channel_id: channelId,
          parent_message_id: parentMessageId || null,
          attachments: attachments.length > 0 ? attachments : null
        })
        .select()
        .single();

      if (messageError) {
        throw messageError;
      }

      // Process mentions if any
      if (mentions.length > 0 && messageData) {
        const messageId = messageData.id;
        
        // Get all users in the channel
        const { data: channelMembers } = await supabase
          .from('channel_members')
          .select('user_id, user:users(username)')
          .eq('channel_id', channelId);
        
        if (channelMembers) {
          const userMap = new Map();
          channelMembers.forEach(member => {
            if (member.user && member.user.username) {
              userMap.set(member.user.username.toLowerCase(), member.user_id);
            }
          });
          
          // Create mention records
          const mentionPromises = mentions.map(async mention => {
            const username = mention.substring(1).toLowerCase();
            const userId = userMap.get(username);
            
            if (userId && userId !== currentUserId) {
              return supabase
                .from('message_mentions')
                .insert({
                  message_id: messageId,
                  mentioned_user_id: userId,
                  mentioning_user_id: currentUserId
                });
            }
            return null;
          });
          
          await Promise.all(mentionPromises);
        }
      }

      return messageData?.id || '';
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!currentUserId) {
      throw new Error("User ID not available");
    }

    try {
      // First delete any mentions associated with this message
      await supabase
        .from('message_mentions')
        .delete()
        .eq('message_id', messageId);
      
      // Then delete the message itself
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', currentUserId);

      if (error) {
        throw error;
      }
      
      // Refresh messages
      await fetchMessages(0, 100);
    } catch (error) {
      console.error("Error deleting message:", error);
      throw error;
    }
  };

  const reactToMessage = async (messageId: string, emoji: string) => {
    if (!currentUserId) {
      throw new Error("User ID not available");
    }

    try {
      // Get current message reactions
      const { data: messageData, error: fetchError } = await supabase
        .from('chat_messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      let reactions = {};
      
      // Parse existing reactions
      if (messageData?.reactions) {
        if (typeof messageData.reactions === 'string') {
          reactions = JSON.parse(messageData.reactions);
        } else {
          reactions = messageData.reactions;
        }
      }

      // Update reactions
      if (!reactions[emoji]) {
        reactions[emoji] = [currentUserId];
      } else {
        const userIndex = reactions[emoji].indexOf(currentUserId);
        if (userIndex === -1) {
          reactions[emoji].push(currentUserId);
        } else {
          reactions[emoji].splice(userIndex, 1);
          if (reactions[emoji].length === 0) {
            delete reactions[emoji];
          }
        }
      }

      // Update message with new reactions
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ reactions })
        .eq('id', messageId);

      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      console.error("Error reacting to message:", error);
      throw error;
    }
  };

  const markMentionsAsRead = async () => {
    if (!currentUserId || !channelId) return;

    try {
      await supabase
        .from('message_mentions')
        .update({ read: true })
        .eq('mentioned_user_id', currentUserId)
        .eq('channel_id', channelId);
    } catch (error) {
      console.error("Error marking mentions as read:", error);
    }
  };

  return {
    sendMessage,
    deleteMessage,
    reactToMessage,
    markMentionsAsRead,
    isUploading
  };
};
