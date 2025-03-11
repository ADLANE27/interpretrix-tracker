
import { supabase } from '@/integrations/supabase/client';
import { Message, MessageData, Attachment, isAttachment } from '@/types/messaging';

interface SenderDetails {
  id: string;
  name: string;
  avatar_url: string;
}

export const useMessageFormatter = () => {
  const formatMessage = async (messageData: MessageData): Promise<Message | null> => {
    if (!messageData?.id || !messageData?.sender_id) {
      console.error('Missing required message data:', messageData);
      return null;
    }

    try {
      // Get sender details
      const { data: senderDetails, error: senderError } = await supabase
        .rpc('get_message_sender_details', {
          sender_id: messageData.sender_id
        })
        .single();

      if (senderError) {
        console.error('Error fetching sender details:', senderError);
        return null;
      }

      const typedSenderDetails = senderDetails as SenderDetails;

      // Get channel type
      const { data: channelData, error: channelError } = await supabase
        .from('chat_channels')
        .select('channel_type')
        .eq('id', messageData.channel_id)
        .single();

      if (channelError) {
        console.error('Error fetching channel type:', channelError);
        return null;
      }

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

      const parsedAttachments: Attachment[] = [];
      if (Array.isArray(messageData.attachments)) {
        for (const att of messageData.attachments) {
          if (typeof att === 'object' && att !== null) {
            const attachment = {
              url: String(att['url'] || ''),
              filename: String(att['filename'] || ''),
              type: String(att['type'] || ''),
              size: Number(att['size'] || 0)
            };
            if (isAttachment(attachment)) {
              parsedAttachments.push(attachment);
            }
          }
        }
      }

      return {
        id: messageData.id,
        content: messageData.content,
        sender: {
          id: typedSenderDetails.id,
          name: typedSenderDetails.name,
          avatarUrl: typedSenderDetails.avatar_url
        },
        timestamp: new Date(messageData.created_at),
        reactions: parsedReactions,
        attachments: parsedAttachments,
        channelType: channelData.channel_type as "group" | "direct"
      };
    } catch (error) {
      console.error('Error formatting message:', error);
      return null;
    }
  };

  return { formatMessage };
};
