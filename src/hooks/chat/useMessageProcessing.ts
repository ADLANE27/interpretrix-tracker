
import { useState, useRef, useCallback } from 'react';
import { Message } from '@/types/messaging';
import { supabase } from "@/integrations/supabase/client";
import { MessageMapRef, ChatChannelType } from './types/chatHooks';

export const useMessageProcessing = (channelId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const userRole = useRef<'admin' | 'interpreter' | null>(null);
  const messagesMap = useRef<Map<string, Message>>(new Map());
  const lastFetchTimestamp = useRef<string | null>(null);
  const processingMessage = useRef<boolean>(false);

  // Helper function to determine role
  const checkUserRole = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        userRole.current = data.role as 'admin' | 'interpreter';
        console.log(`[useMessageProcessing] User role identified as: ${userRole.current}`);
      }
    } catch (error) {
      console.error('[useMessageProcessing] Error determining user role:', error);
    }
  }, []);

  // Convert messages map to sorted array
  const updateMessagesArray = useCallback(() => {
    const messagesArray = Array.from(messagesMap.current.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    setMessages(messagesArray);
  }, []);

  // Process a single message from DB to Message format
  const processMessage = useCallback(async (messageData: any, channelType: ChatChannelType): Promise<Message | null> => {
    try {
      // If message already exists in map, just update timestamp and reactions
      if (messagesMap.current.has(messageData.id)) {
        const existingMessage = messagesMap.current.get(messageData.id)!;
        existingMessage.timestamp = new Date(messageData.created_at);
        if (messageData.reactions) {
          let parsedReactions = {};
          if (typeof messageData.reactions === 'string') {
            try {
              parsedReactions = JSON.parse(messageData.reactions);
            } catch (e) {
              console.error(`[useMessageProcessing] Error parsing reactions string:`, e);
            }
          } else if (messageData.reactions && typeof messageData.reactions === 'object') {
            parsedReactions = messageData.reactions;
          }
          existingMessage.reactions = parsedReactions as Record<string, string[]>;
          console.log(`[useMessageProcessing] Updated reactions for message:`, messageData.id, existingMessage.reactions);
        }
        return existingMessage;
      }
      
      // Fetch sender details
      const { data: senderData, error: senderError } = await supabase
        .rpc('get_message_sender_details', {
          sender_id: messageData.sender_id
        });

      if (senderError) {
        console.error(`[useMessageProcessing] Error fetching sender details:`, senderError);
        return null;
      }

      const sender = senderData?.[0];
      if (!sender?.id || !sender?.name) {
        console.error(`[useMessageProcessing] Invalid sender data:`, sender);
        return null;
      }

      // Process reactions
      let parsedReactions = {};
      try {
        if (typeof messageData.reactions === 'string') {
          parsedReactions = JSON.parse(messageData.reactions);
        } else if (messageData.reactions && typeof messageData.reactions === 'object') {
          parsedReactions = messageData.reactions;
        }
      } catch (e) {
        console.error(`[useMessageProcessing] Error parsing reactions:`, e);
      }
      
      console.log(`[useMessageProcessing] Message reactions raw:`, messageData.reactions);
      console.log(`[useMessageProcessing] Message reactions parsed:`, parsedReactions);

      // Process attachments
      const parsedAttachments = [];
      if (Array.isArray(messageData.attachments)) {
        for (const att of messageData.attachments) {
          if (typeof att === 'object' && att !== null) {
            const attachment = {
              url: String(att['url'] || ''),
              filename: String(att['filename'] || ''),
              type: String(att['type'] || ''),
              size: Number(att['size'] || 0)
            };
            if (attachment.url && attachment.filename) {
              parsedAttachments.push(attachment);
            }
          }
        }
      }

      // Create formatted message
      const formattedMessage: Message = {
        id: messageData.id,
        content: messageData.content,
        sender: {
          id: sender.id,
          name: sender.name,
          avatarUrl: sender.avatar_url || ''
        },
        timestamp: new Date(messageData.created_at),
        parent_message_id: messageData.parent_message_id,
        attachments: parsedAttachments,
        channelType: channelType,
        reactions: parsedReactions as Record<string, string[]>
      };

      // Add to messages map
      messagesMap.current.set(messageData.id, formattedMessage);
      
      return formattedMessage;
    } catch (error) {
      console.error(`[useMessageProcessing] Error formatting message:`, error, messageData);
      return null;
    }
  }, []);

  return {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    hasMoreMessages,
    setHasMoreMessages,
    userRole,
    messagesMap,
    lastFetchTimestamp,
    processingMessage,
    checkUserRole,
    updateMessagesArray,
    processMessage
  };
};
