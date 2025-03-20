
import { useState, useRef, useCallback, useMemo } from 'react';
import { useRoleIdentification } from '../useRoleIdentification';
import { Message, MessageData } from '@/types/messaging';
import { supabase } from "@/integrations/supabase/client";
import { MessageMapRef, ChatChannelType } from './types/chatHooks';

export const useMessageProcessing = (channelId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const messagesMap = useRef<Map<string, Message>>(new Map());
  const processingMessage = useRef(false);
  const lastFetchTimestamp = useRef<string | null>(null);
  const userRole = useRef<string>('unknown');
  const { identifyUserRole } = useRoleIdentification();

  // Check user role
  const checkUserRole = useCallback(async () => {
    const role = await identifyUserRole();
    userRole.current = role || 'unknown';
    console.log(`[useMessageProcessing] User role identified as: ${userRole.current}`);
    return userRole.current;
  }, [identifyUserRole]);

  // Update messages array
  const updateMessagesArray = useCallback(() => {
    if (messagesMap.current.size === 0) {
      setMessages([]);
      return;
    }

    const updatedMessages = Array.from(messagesMap.current.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    setMessages(updatedMessages);
    console.log(`[useMessageProcessing ${userRole.current}] Updated messages array:`, updatedMessages.length);
  }, [userRole]);

  // Process a single message
  const processMessage = useCallback(async (messageData: MessageData, channelType: ChatChannelType) => {
    try {
      // Check if message already exists in map
      if (messagesMap.current.has(messageData.id)) {
        // Update existing message if needed
        const existingMessage = messagesMap.current.get(messageData.id)!;
        
        // Process reactions
        let messageReactions: Record<string, string[]> = {};
        
        if (messageData.reactions) {
          // Handle reactions as string or object
          if (typeof messageData.reactions === 'string') {
            try {
              messageReactions = JSON.parse(messageData.reactions);
            } catch (e) {
              console.error(`[useMessageProcessing ${userRole.current}] Failed to parse reactions string:`, e);
              messageReactions = {};
            }
          } else if (typeof messageData.reactions === 'object') {
            messageReactions = messageData.reactions as Record<string, string[]>;
          }
        }
        
        // Only update if something changed (reactions, etc.)
        const updatedMessage = {
          ...existingMessage,
          reactions: messageReactions
        };
        
        messagesMap.current.set(messageData.id, updatedMessage);
        console.log(`[useMessageProcessing ${userRole.current}] Updated existing message:`, messageData.id);
        return;
      }

      // Get sender details
      const { data: senderDetails, error: senderError } = await supabase
        .rpc('get_message_sender_details', {
          sender_id: messageData.sender_id,
        });

      if (senderError) {
        console.error(`[useMessageProcessing ${userRole.current}] Error getting sender details:`, senderError);
        return;
      }

      if (!senderDetails || senderDetails.length === 0) {
        console.error(`[useMessageProcessing ${userRole.current}] No sender details found for:`, messageData.sender_id);
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
            console.error(`[useMessageProcessing ${userRole.current}] Failed to parse reactions string:`, e);
            messageReactions = {};
          }
        } else if (typeof messageData.reactions === 'object') {
          messageReactions = messageData.reactions as Record<string, string[]>;
        }
      }

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
        attachments: messageData.attachments ? messageData.attachments.map(attachment => {
          if (typeof attachment === 'object') {
            return attachment as any;
          }
          // Handle case where attachment might be a string or other format
          return {
            url: '',
            filename: '',
            type: '',
            size: 0
          };
        }) : [],
        channelType: channelType,
        reactions: messageReactions
      };

      // Add to map
      messagesMap.current.set(message.id, message);
      console.log(`[useMessageProcessing ${userRole.current}] Processed message:`, message.id);

    } catch (error) {
      console.error(`[useMessageProcessing ${userRole.current}] Error processing message:`, error);
    }
  }, [userRole]);

  return {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    hasMoreMessages,
    setHasMoreMessages,
    messagesMap,
    processingMessage,
    lastFetchTimestamp,
    userRole,
    updateMessagesArray,
    processMessage,
    checkUserRole
  };
};
