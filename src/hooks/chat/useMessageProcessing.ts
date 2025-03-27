
import { useState, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Message, Attachment, isAttachment } from '@/types/messaging';

export const useMessageProcessing = () => {
  const userRole = useRef<'admin' | 'interpreter' | null>(null);
  
  // Determine user role for debugging
  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        userRole.current = data.role as 'admin' | 'interpreter';
        console.log(`[useChat] User role identified as: ${userRole.current}`);
        return userRole.current;
      }
      return null;
    } catch (error) {
      console.error('[useChat] Error determining user role:', error);
      return null;
    }
  };

  const formatMessage = async (message: any, channelType: 'group' | 'direct'): Promise<Message | null> => {
    try {
      const { data: senderData, error: senderError } = await supabase
        .rpc('get_message_sender_details', {
          sender_id: message.sender_id
        });

      if (senderError) {
        console.error(`[useChat ${userRole.current}] Error fetching sender details:`, senderError);
        return null;
      }

      const sender = senderData?.[0];
      if (!sender?.id || !sender?.name) {
        console.error(`[useChat ${userRole.current}] Invalid sender data:`, sender);
        return null;
      }

      let parsedReactions = {};
      try {
        if (typeof message.reactions === 'string') {
          parsedReactions = JSON.parse(message.reactions);
        } else if (message.reactions && typeof message.reactions === 'object') {
          parsedReactions = message.reactions;
        }
      } catch (e) {
        console.error(`[useChat ${userRole.current}] Error parsing reactions:`, e);
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

      const formattedMessage: Message = {
        id: message.id,
        content: message.content,
        sender: {
          id: sender.id,
          name: sender.name,
          avatarUrl: sender.avatar_url || ''
        },
        timestamp: new Date(message.created_at),
        parent_message_id: message.parent_message_id,
        reactions: parsedReactions,
        attachments: parsedAttachments,
        channelType: channelType
      };
      
      return formattedMessage;
    } catch (error) {
      console.error(`[useChat ${userRole.current}] Error formatting message:`, error, message);
      return null;
    }
  };

  return {
    checkUserRole,
    formatMessage,
    userRole
  };
};
