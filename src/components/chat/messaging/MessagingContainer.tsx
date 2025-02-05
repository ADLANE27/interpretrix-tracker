
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

  const validMessages = messages?.reduce<Message[]>((acc, rawMsg) => {
    try {
      if (!rawMsg) return acc;

      const messageData = {
        id: rawMsg.id,
        content: rawMsg.content || '',
        sender: {
          id: rawMsg.sender.id,
          name: rawMsg.sender.name || 'Unknown User',
          avatarUrl: rawMsg.sender.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rawMsg.sender.id}`
        },
        timestamp: rawMsg.timestamp instanceof Date ? rawMsg.timestamp : new Date(rawMsg.timestamp),
        parent_message_id: rawMsg.parent_message_id || null,
        reactions: rawMsg.reactions || {},
        attachments: Array.isArray(rawMsg.attachments) ? rawMsg.attachments.map(att => ({
          url: att.url,
          filename: att.filename,
          type: att.type,
          size: att.size
        })) : []
      };

      const validatedMessage = MessageSchema.parse(messageData);
      acc.push(validatedMessage);
    } catch (error) {
      console.error('Message validation failed:', error, rawMsg);
    }
    return acc;
  }, []) || [];

  return (
    <ChatWindow
      messages={validMessages}
      onSendMessage={handleSendMessage}
      isLoading={isLoading}
      channelId={channelId}
    />
  );
};
