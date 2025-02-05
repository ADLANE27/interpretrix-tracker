
import { useEffect, useState } from "react";
import { ChatWindow } from "../ChatWindow";
import { useChat } from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/client";
import { Message, MessageSchema } from "@/types/messaging";

interface MessagingContainerProps {
  channelId: string;
}

export const MessagingContainer = ({ channelId }: MessagingContainerProps) => {
  const { messages, isLoading, sendMessage } = useChat(channelId);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  const handleSendMessage = async (content: string, parentMessageId?: string): Promise<string> => {
    if (!currentUserId) throw new Error("User not authenticated");
    const messageId = await sendMessage(content, parentMessageId);
    if (!messageId) throw new Error("Failed to send message");
    return messageId;
  };

  // Transform messages to ensure they match the required Message type
  const validMessages = (messages || []).reduce<Message[]>((acc, msg) => {
    if (!msg || !msg.sender) {
      console.error('Invalid message or missing sender:', msg);
      return acc;
    }

    try {
      // First create a complete object with all required fields
      const completeMessage = {
        id: msg.id || crypto.randomUUID(),
        content: msg.content || '',
        sender: {
          id: msg.sender.id || crypto.randomUUID(),
          name: msg.sender.name || 'Unknown User',
          avatarUrl: msg.sender.avatarUrl
        },
        timestamp: msg.timestamp || new Date(),
        parent_message_id: msg.parent_message_id,
        reactions: msg.reactions || {},
        attachments: Array.isArray(msg.attachments) 
          ? msg.attachments.map(att => ({
              url: att?.url || '',
              filename: att?.filename || '',
              type: att?.type || '',
              size: att?.size || 0
            }))
          : []
      };

      // Validate with Zod schema
      const validatedMessage = MessageSchema.parse(completeMessage);
      acc.push(validatedMessage);
      return acc;
    } catch (error) {
      console.error('Message validation failed:', error, msg);
      return acc;
    }
  }, []);

  return (
    <ChatWindow
      messages={validMessages}
      onSendMessage={handleSendMessage}
      isLoading={isLoading}
      channelId={channelId}
      currentUserId={currentUserId}
    />
  );
};
