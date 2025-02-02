import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MentionInput } from "./components/MentionInput";
import { MessageList } from "./components/MessageList";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RealtimeChannel } from "@supabase/supabase-js";

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  channel_id: string;
  sender?: {
    first_name: string;
    last_name: string;
  };
}

interface Channel {
  id: string;
  name: string;
}

export const TeamChat = () => {
  const { channelId } = useParams();
  const [newMessage, setNewMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const { data: channels } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as Channel[];
    },
  });

  const selectedChannel = channels?.find(c => c.id === channelId);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", channelId],
    queryFn: async () => {
      if (!channelId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:profiles(first_name, last_name)
        `)
        .eq("channel_id", channelId)
        .order("created_at");
      
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!channelId,
  });

  useEffect(() => {
    if (!channelId) return;

    const newChannel = supabase.channel(`messages:${channelId}`);

    newChannel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          queryClient.invalidateQueries(["messages", channelId]);
        }
      )
      .subscribe();

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
    };
  }, [channelId, queryClient]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleMention = async (mentionData: { type: "user" | "language", value: string }) => {
    if (!selectedChannel) return;

    if (mentionData.type === "language") {
      const { data: matchingInterpreters, error } = await supabase
        .from("interpreter_profiles")
        .select("id, languages")
        .filter("languages", "cs", `{%→ ${mentionData.value}%}`);

      if (error) {
        console.error("Error fetching interpreters:", error);
        return;
      }

      const mentionPromises = matchingInterpreters.map(interpreter => 
        supabase
          .from("message_mentions")
          .insert({
            message_id: messageId,
            mentioned_user_id: interpreter.id,
            mentioned_language: mentionData.value
          })
      );

      await Promise.all(mentionPromises);
    } else {
      const { data: mentionedUser, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .ilike("first_name || ' ' || last_name", mentionData.value)
        .single();

      if (userError || !mentionedUser) {
        console.error("Error finding mentioned user:", userError);
        return;
      }

      const { error: mentionError } = await supabase
        .from("message_mentions")
        .insert({
          message_id: messageId,
          mentioned_user_id: mentionedUser.id
        });

      if (mentionError) {
        console.error("Error creating mention:", mentionError);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !channelId || isSubmitting) return;

    try {
      setIsSubmitting(true);

      const { data: message, error } = await supabase
        .from("messages")
        .insert({
          content: newMessage,
          channel_id: channelId,
        })
        .select()
        .single();

      if (error) throw error;

      setNewMessage("");
      scrollToBottom();

    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!channelId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">
          Sélectionnez un canal pour commencer à discuter
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList messages={messages || []} />
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <MentionInput
            value={newMessage}
            onChange={setNewMessage}
            onMention={handleMention}
            placeholder="Écrivez votre message..."
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isSubmitting || !newMessage.trim()}
          >
            Envoyer
          </Button>
        </div>
      </div>
    </div>
  );
};