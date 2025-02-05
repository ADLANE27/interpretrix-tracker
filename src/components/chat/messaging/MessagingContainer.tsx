
import { useEffect, useState } from "react";
import { ChatWindow } from "../ChatWindow";
import { useChat } from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/messaging";

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

  // Ensure messages match the required Message type
  const validMessages: Message[] = messages?.map(msg => ({
    id: msg.id || '',
    content: msg.content || '',
    sender: {
      id: msg.sender?.id || '',
      name: msg.sender?.name || '',
      avatarUrl: msg.sender?.avatarUrl
    },
    timestamp: msg.timestamp || new Date(),
    parent_message_id: msg.parent_message_id,
    reactions: msg.reactions || {},
    attachments: msg.attachments?.map(att => ({
      url: att.url || '',
      filename: att.filename || '',
      type: att.type || '',
      size: att.size || 0
    }))
  })) || [];

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
