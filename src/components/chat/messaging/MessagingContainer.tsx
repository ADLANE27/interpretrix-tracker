import { useEffect, useState } from "react";
import { ChatWindow } from "../ChatWindow";
import { useChat } from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/client";

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
    return messageId;
  };

  return (
    <ChatWindow
      messages={messages}
      onSendMessage={handleSendMessage}
      isLoading={isLoading}
      channelId={channelId}
    />
  );
};