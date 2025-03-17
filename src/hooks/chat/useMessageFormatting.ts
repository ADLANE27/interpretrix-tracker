
import { useRef, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Message, Attachment, isAttachment } from '@/types/messaging';

export const useMessageFormatting = () => {
  // Cache for sender details to avoid redundant fetches
  const senderCache = useRef<Map<string, { id: string; name: string; avatarUrl: string }>>(new Map());
  
  const formatSingleMessage = useCallback(async (message: any, channelType: 'group' | 'direct' | null): Promise<Message | null> => {
    try {
      let sender = senderCache.current.get(message.sender_id);
      
      if (!sender) {
        // Only fetch this sender's details if not cached
        const { data: senderData, error: senderError } = await supabase
          .rpc('get_message_sender_details', {
            sender_id: message.sender_id
          });

        if (senderError) {
          console.error('[Chat] Error fetching sender:', senderError);
          return null;
        }

        if (!senderData || !senderData[0]) {
          console.error('[Chat] Sender not found:', message.sender_id);
          return null;
        }
        
        // Cache sender details with correct property mapping
        senderCache.current.set(message.sender_id, {
          id: senderData[0].id,
          name: senderData[0].name,
          avatarUrl: senderData[0].avatar_url || ''
        });
        
        sender = senderCache.current.get(message.sender_id);
      }

      let parsedReactions = {};
      try {
        if (typeof message.reactions === 'string') {
          parsedReactions = JSON.parse(message.reactions);
        } else if (message.reactions && typeof message.reactions === 'object') {
          parsedReactions = message.reactions;
        }
      } catch (e) {
        console.error('[Chat] Error parsing reactions:', e);
      }

      const parsedAttachments: Attachment[] = [];
      if (Array.isArray(message.attachments)) {
        message.attachments.forEach(att => {
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
        });
      }

      if (!sender) {
        console.error('[Chat] Sender still not available after fetching');
        return null;
      }

      return {
        id: message.id,
        content: message.content,
        sender: {
          id: sender.id,
          name: sender.name,
          avatarUrl: sender.avatarUrl
        },
        timestamp: new Date(message.created_at),
        parent_message_id: message.parent_message_id,
        reactions: parsedReactions,
        attachments: parsedAttachments,
        channelType: channelType || 'group'
      } as Message;
    } catch (error) {
      console.error('[Chat] Error formatting message:', error, message);
      return null;
    }
  }, []);

  const batchFormatMessages = useCallback(async (messages: any[], channelType: 'group' | 'direct' | null): Promise<Message[]> => {
    // Get unique sender IDs to batch fetch user details
    const senderIds = Array.from(
      new Set(
        messages
          .map(msg => msg.sender_id)
          .filter(id => !senderCache.current.has(id))
      )
    );
    
    // Only batch fetch for senders we don't have cached
    if (senderIds.length > 0) {
      const { data: sendersData, error: sendersError } = await supabase
        .rpc('batch_get_message_sender_details', {
          p_sender_ids: senderIds
        });
      
      if (sendersError) {
        console.error('[Chat] Error fetching batch sender details:', sendersError);
      } else if (sendersData) {
        // Add to cache with correct property mapping
        sendersData.forEach(sender => {
          senderCache.current.set(sender.id, {
            id: sender.id,
            name: sender.name,
            avatarUrl: sender.avatar_url || ''
          });
        });
      }
    }

    // Format all messages in parallel
    const formattedMessages = await Promise.all(
      messages.map(message => formatSingleMessage(message, channelType))
    );

    // Filter out any null results
    return formattedMessages.filter(Boolean) as Message[];
  }, [formatSingleMessage]);

  return {
    formatSingleMessage,
    batchFormatMessages
  };
};
