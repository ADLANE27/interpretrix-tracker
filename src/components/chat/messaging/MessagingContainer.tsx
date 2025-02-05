
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

  // Transform messages to ensure they match the required Message type
  const validMessages: Message[] = messages?.map(msg => ({
    id: msg.id ? msg.id : crypto.randomUUID(), // Ensure id is never undefined
    content: msg.content || '',
    sender: {
      id: msg.sender?.id || crypto.randomUUID(), // Ensure sender.id is never undefined
      name: msg.sender?.name || 'Unknown User', // Ensure name is never undefined
      avatarUrl: msg.sender?.avatarUrl // Optional, can remain undefined
    },
    timestamp: msg.timestamp || new Date(), // Ensure timestamp is never undefined
    parent_message_id: msg.parent_message_id, // Optional, can remain undefined
    reactions: msg.reactions || {}, // Ensure reactions is never undefined
    attachments: (msg.attachments || []).map(att => ({
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
