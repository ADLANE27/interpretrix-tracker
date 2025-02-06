import { useEffect, useState } from "react";
import { ChatWindow } from "../ChatWindow";
import { useChat } from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/messaging";
import { useToast } from "@/hooks/use-toast";

interface MessagingContainerProps {
  channelId: string;
}

export const MessagingContainer = ({ channelId }: MessagingContainerProps) => {
  const { messages, isLoading, sendMessage } = useChat(channelId);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('No user found');
          return;
        }

        // Check if user is a member of the channel
        const { data: membership, error: membershipError } = await supabase
          .from("channel_members")
          .select("user_id")
          .eq("channel_id", channelId)
          .eq("user_id", user.id)
          .maybeSingle(); // Using maybeSingle instead of single

        if (membershipError) {
          console.error('Error checking channel membership:', membershipError);
          toast({
            title: "Error",
            description: "Failed to verify channel membership",
            variant: "destructive",
          });
          return;
        }

        // If not a member and not an admin, show error
        if (!membership) {
          const { data: isAdmin } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle();

          if (!isAdmin) {
            toast({
              title: "Access Denied",
              description: "You are not a member of this channel",
              variant: "destructive",
            });
            return;
          }
        }

        setCurrentUserId(user.id);
      } catch (error) {
        console.error('Error getting current user:', error);
        toast({
          title: "Error",
          description: "Failed to get user information",
          variant: "destructive",
        });
      }
    };
    getCurrentUser();
  }, [channelId, toast]);

  const handleSendMessage = async (content: string, parentMessageId?: string): Promise<string> => {
    if (!currentUserId) throw new Error("User not authenticated");
    const messageId = await sendMessage(content, parentMessageId);
    if (!messageId) throw new Error("Failed to send message");
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