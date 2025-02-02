import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MentionInput } from "./components/MentionInput";
import { MessageList } from "./components/MessageList";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  channel_id?: string;
  recipient_id?: string;
  read_at?: string;
  attachment_url?: string;
  attachment_name?: string;
  parent_id?: string;
  updated_at: string;
  sender?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface Channel {
  id: string;
  name: string;
}

interface MessageResponse {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  channel_id: string | null;
  recipient_id: string | null;
  read_at: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  parent_id: string | null;
  updated_at: string;
  sender: {
    profile: {
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
}

export const TeamChat = () => {
  const { channelId } = useParams();
  const [newMessage, setNewMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
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
          sender:sender_id (
            profile:interpreter_profiles (
              first_name,
              last_name
            )
          )
        `)
        .eq("channel_id", channelId)
        .order("created_at");
      
      if (error) throw error;
      
      // Transform the data to match our Message interface
      return (data as MessageResponse[] || []).map(msg => ({
        ...msg,
        sender: msg.sender?.profile ? {
          first_name: msg.sender.profile.first_name || null,
          last_name: msg.sender.profile.last_name || null
        } : null
      })) as Message[];
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
          queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
        }
      )
      .subscribe();

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
    };
  }, [channelId, queryClient]);

  const handleEditStart = (messageId: string, content: string) => {
    setEditingMessage(messageId);
    setEditContent(content);
  };

  const handleEditCancel = () => {
    setEditingMessage(null);
    setEditContent("");
  };

  const handleEditSave = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .update({ content: editContent })
        .eq("id", messageId);

      if (error) throw error;

      setEditingMessage(null);
      setEditContent("");
    } catch (error: any) {
      console.error("Error updating message:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le message",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error deleting message:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le message",
        variant: "destructive",
      });
    }
  };

  const handleMention = async (mentionData: { type: "user" | "language", value: string }) => {
    if (!selectedChannel) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // First create the message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        content: newMessage,
        channel_id: channelId,
        sender_id: user.id
      })
      .select()
      .single();

    if (messageError || !message) {
      console.error("Error creating message:", messageError);
      return;
    }

    if (mentionData.type === "language") {
      // Only query interpreters (excluding admins) for language mentions
      const { data: matchingInterpreters, error } = await supabase
        .from("interpreter_profiles")
        .select(`
          id, 
          languages
        `)
        .filter('languages', 'cs', `{${mentionData.value}}`)
        .not('id', 'in', (
          supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'admin')
        ));

      if (error) {
        console.error("Error fetching interpreters:", error);
        return;
      }

      // Then create mentions for each interpreter
      const mentionPromises = matchingInterpreters.map(interpreter => 
        supabase
          .from("message_mentions")
          .insert({
            message_id: message.id,
            mentioned_user_id: interpreter.id,
            mentioned_language: mentionData.value
          })
      );

      await Promise.all(mentionPromises);
    } else {
      // For user mentions, we'll allow mentioning both interpreters and admins
      const { data: mentionedUser, error: userError } = await supabase
        .from("interpreter_profiles")
        .select("id")
        .ilike("first_name || ' ' || last_name", `%${mentionData.value}%`)
        .single();

      if (userError || !mentionedUser) {
        console.error("Error finding mentioned user:", userError);
        return;
      }

      const { error: mentionError } = await supabase
        .from("message_mentions")
        .insert({
          message_id: message.id,
          mentioned_user_id: mentionedUser.id
        });

      if (mentionError) {
        console.error("Error creating mention:", mentionError);
      }
    }

    setNewMessage("");
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !channelId || isSubmitting) return;

    try {
      setIsSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("messages")
        .insert({
          content: newMessage,
          channel_id: channelId,
          sender_id: user.id
        });

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        <MessageList 
          messages={messages || []}
          selectedInterpreter=""
          editingMessage={editingMessage}
          editContent={editContent}
          onEditStart={handleEditStart}
          onEditCancel={handleEditCancel}
          onEditSave={handleEditSave}
          onEditChange={setEditContent}
          onDeleteMessage={handleDeleteMessage}
        />
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