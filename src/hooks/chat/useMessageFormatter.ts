import { supabase } from '@/integrations/supabase/client';
import { Message, MessageData, Attachment, isAttachment } from '@/types/messaging';

export const useMessageFormatter = () => {
  const formatMessage = async (messageData: MessageData): Promise<Message | null> => {
    if (!messageData?.id || !messageData?.sender_id) {
      console.error('Missing required message data:', messageData);
      return null;
    }

    try {
      const { data: senderDetails, error: senderError } = await supabase
        .rpc('get_message_sender_details', {
          sender_id: messageData.sender_id
        })
        .single();

      if (senderError) {
        console.error('Error fetching sender details:', senderError);
        return null;
      }

      // Parse and validate reactions
      let parsedReactions: Record<string, string[]> = {};
      try {
        if (typeof messageData.reactions === 'string') {
          parsedReactions = JSON.parse(messageData.reactions);
        } else if (messageData.reactions && typeof messageData.reactions === 'object') {
          parsedReactions = messageData.reactions as Record<string, string[]>;
        }
      } catch (e) {
        console.error('Error parsing reactions:', e);
        parsedReactions = {};
      }

      // Parse and validate attachments
      const parsedAttachments: Attachment[] = [];
      if (Array.isArray(messageData.attachments)) {
        for (const att of messageData.attachments) {
          if (isAttachment(att)) {
            parsedAttachments.push(att);
          } else if (typeof att === 'object' && att !== null) {
            const constructedAttachment = {
              url: String(att['url'] || ''),
              filename: String(att['filename'] || ''),
              type: String(att['type'] || ''),
              size: Number(att['size'] || 0)
            };
            if (isAttachment(constructedAttachment)) {
              parsedAttachments.push(constructedAttachment);
            }
          }
        }
      }

      const sender = {
        id: messageData.sender_id,
        name: senderDetails?.name || 'Unknown User',
        avatarUrl: senderDetails?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${messageData.sender_id}`
      };

      return {
        id: messageData.id,
        content: messageData.content || '',
        sender,
        timestamp: new Date(messageData.created_at),
        parent_message_id: messageData.parent_message_id || undefined,
        reactions: parsedReactions,
        attachments: parsedAttachments
      };
    } catch (error) {
      console.error('Error formatting message:', error);
      return null;
    }
  };

  return { formatMessage };
};