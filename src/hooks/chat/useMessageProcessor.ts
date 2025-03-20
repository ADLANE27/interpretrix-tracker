
import { useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { MessageData, Message } from '@/types/messaging';
import { ChatChannelType } from './types/chatHooks';

export const useMessageProcessor = (userRole: React.MutableRefObject<string>) => {
  // Process a single message with improved error handling
  const processMessage = useCallback(async (
    messageData: MessageData, 
    channelType: ChatChannelType,
    messagesMap: Map<string, Message>,
    pendingMessageUpdates: Set<string>,
    updateMessagesArray: () => void
  ) => {
    try {
      // Track this message ID as pending an update
      pendingMessageUpdates.add(messageData.id);
      
      // Check if message already exists in map
      if (messagesMap.has(messageData.id)) {
        // Update existing message if needed
        const existingMessage = messagesMap.get(messageData.id)!;
        
        // Process reactions
        let messageReactions: Record<string, string[]> = {};
        
        if (messageData.reactions) {
          // Handle reactions as string or object
          if (typeof messageData.reactions === 'string') {
            try {
              messageReactions = JSON.parse(messageData.reactions);
            } catch (e) {
              console.error(`[useMessageProcessor ${userRole.current}] Failed to parse reactions string:`, e);
              messageReactions = {};
            }
          } else if (typeof messageData.reactions === 'object') {
            messageReactions = messageData.reactions as Record<string, string[]>;
          }
        }
        
        // Process attachments - ensure they're properly formatted
        const attachments = messageData.attachments 
          ? messageData.attachments.map(attachment => {
              if (typeof attachment === 'object' && attachment !== null) {
                return attachment;
              }
              return {
                url: '',
                filename: '',
                type: '',
                size: 0
              };
            }) 
          : existingMessage.attachments;
        
        // Only update if something changed (reactions, etc.)
        const updatedMessage = {
          ...existingMessage,
          content: messageData.content || existingMessage.content,
          reactions: messageReactions,
          attachments
        };
        
        messagesMap.set(messageData.id, updatedMessage);
        console.log(`[useMessageProcessor ${userRole.current}] Updated existing message:`, messageData.id);
        pendingMessageUpdates.delete(messageData.id);
        return;
      }

      // Get sender details
      const { data: senderDetails, error: senderError } = await supabase
        .rpc('get_message_sender_details', {
          sender_id: messageData.sender_id,
        });

      if (senderError) {
        console.error(`[useMessageProcessor ${userRole.current}] Error getting sender details:`, senderError);
        pendingMessageUpdates.delete(messageData.id);
        return;
      }

      if (!senderDetails || senderDetails.length === 0) {
        console.error(`[useMessageProcessor ${userRole.current}] No sender details found for:`, messageData.sender_id);
        pendingMessageUpdates.delete(messageData.id);
        return;
      }

      // Process reactions
      let messageReactions: Record<string, string[]> = {};
      
      if (messageData.reactions) {
        // Handle reactions as string or object
        if (typeof messageData.reactions === 'string') {
          try {
            messageReactions = JSON.parse(messageData.reactions);
          } catch (e) {
            console.error(`[useMessageProcessor ${userRole.current}] Failed to parse reactions string:`, e);
            messageReactions = {};
          }
        } else if (typeof messageData.reactions === 'object') {
          messageReactions = messageData.reactions as Record<string, string[]>;
        }
      }

      // Process attachments with better error handling
      const attachments = messageData.attachments 
        ? messageData.attachments.map(attachment => {
            if (typeof attachment === 'object' && attachment !== null) {
              return attachment;
            }
            return {
              url: '',
              filename: '',
              type: '',
              size: 0
            };
          }) 
        : [];

      // Create message object
      const message: Message = {
        id: messageData.id,
        content: messageData.content,
        sender: {
          id: senderDetails[0].id,
          name: senderDetails[0].name,
          avatarUrl: senderDetails[0].avatar_url,
        },
        timestamp: new Date(messageData.created_at),
        parent_message_id: messageData.parent_message_id,
        attachments,
        channelType: channelType,
        reactions: messageReactions
      };

      // Add to map
      messagesMap.set(message.id, message);
      console.log(`[useMessageProcessor ${userRole.current}] Processed new message:`, message.id);
      pendingMessageUpdates.delete(messageData.id);

    } catch (error) {
      console.error(`[useMessageProcessor ${userRole.current}] Error processing message:`, error, messageData);
      pendingMessageUpdates.delete(messageData.id);
    }
  }, []);

  return { processMessage };
};
