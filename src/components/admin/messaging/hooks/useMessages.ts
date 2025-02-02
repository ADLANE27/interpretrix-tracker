import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
  read_at: string | null;
  attachment_url?: string;
  attachment_name?: string;
}

export const useMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchMessages = async (interpreterId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${interpreterId}),and(sender_id.eq.${interpreterId},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les messages",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (content: string) => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from("direct_messages").insert({
        content: content.trim(),
        sender_id: user.id,
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateMessage = async (messageId: string, content: string) => {
    try {
      const { error } = await supabase
        .from("direct_messages")
        .update({ content })
        .eq("id", messageId);

      if (error) throw error;
      setEditingMessage(null);
      setEditContent("");
      toast({
        title: "Succès",
        description: "Message modifié avec succès",
      });
    } catch (error) {
      console.error("Error updating message:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le message",
        variant: "destructive",
      });
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("direct_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      toast({
        title: "Succès",
        description: "Message supprimé avec succès",
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le message",
        variant: "destructive",
      });
    }
  };

  const deleteAllMessages = async (interpreterId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("direct_messages")
        .delete()
        .or(`sender_id.eq.${user.id},sender_id.eq.${interpreterId},recipient_id.eq.${user.id},recipient_id.eq.${interpreterId}`);

      if (error) throw error;

      setMessages([]);
      toast({
        title: "Succès",
        description: "Historique des messages supprimé",
      });

      await fetchMessages(interpreterId);
    } catch (error) {
      console.error("Error deleting all messages:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'historique des messages",
        variant: "destructive",
      });
    }
  };

  return {
    messages,
    editingMessage,
    editContent,
    isLoading,
    setEditingMessage,
    setEditContent,
    fetchMessages,
    sendMessage,
    updateMessage,
    deleteMessage,
    deleteAllMessages,
  };
};