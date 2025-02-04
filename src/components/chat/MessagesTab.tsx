import { useEffect, useState } from "react";
import { ChatWindow } from "./ChatWindow";
import { useChat } from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export const MessagesTab = () => {
  const [channelId, setChannelId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { messages, sendMessage, isLoading } = useChat(channelId || '');
  const { toast } = useToast();

  useEffect(() => {
    const getDefaultChannel = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        setCurrentUserId(user.id);

        // Get user's channels
        const { data: channels, error } = await supabase
          .from('channel_members')
          .select('channel_id')
          .eq('user_id', user.id)
          .limit(1);

        if (error) throw error;
        
        if (channels && channels.length > 0) {
          setChannelId(channels[0].channel_id);
        }
      } catch (error) {
        console.error('Error fetching default channel:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger le canal de discussion",
          variant: "destructive",
        });
      }
    };

    getDefaultChannel();
  }, [toast]);

  if (!channelId || !currentUserId) {
    return (
      <Card className="p-4">
        <div className="text-center text-gray-500">
          Aucun canal de discussion disponible
        </div>
      </Card>
    );
  }

  return (
    <ChatWindow
      messages={messages}
      currentUserId={currentUserId}
      onSendMessage={sendMessage}
      isLoading={isLoading}
    />
  );
};