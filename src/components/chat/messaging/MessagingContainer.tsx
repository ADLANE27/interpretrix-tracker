import { useEffect, useState } from "react";
import { MessageList } from "./MessageList";
import { ChatInput } from "../ChatInput";
import { useChat } from "@/hooks/useChat";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const MessagingContainer = ({ channelId }: { channelId: string }) => {
  const { messages, sendMessage, deleteMessage, reactToMessage, currentUserId } = useChat(channelId);
  const { toast } = useToast();

  const handleMarkMentionsAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('message_mentions')
        .update({ status: 'read' })
        .eq('mentioned_user_id', user.id)
        .eq('channel_id', channelId);

      if (error) throw error;

      toast({
        title: "Mentions marquées comme lues",
        description: "Toutes les mentions ont été marquées comme lues",
      });
    } catch (error) {
      console.error('Error marking mentions as read:', error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer les mentions comme lues",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold">Messages</h2>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleMarkMentionsAsRead}
        >
          <Check className="h-4 w-4" />
          Marquer comme lu
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          onDeleteMessage={deleteMessage}
          onReactToMessage={reactToMessage}
          currentUserId={currentUserId}
        />
      </div>
      <div className="p-4 border-t">
        <ChatInput 
          onSendMessage={sendMessage} 
          channelId={channelId}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
};