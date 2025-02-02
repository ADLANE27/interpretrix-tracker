import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ThreadMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_name?: string;
}

export const useThread = (parentMessageId: string) => {
  const [replies, setReplies] = useState<ThreadMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchReplies();
    
    const channel = supabase
      .channel(`thread-${parentMessageId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `parent_id=eq.${parentMessageId}`,
        },
        () => {
          fetchReplies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parentMessageId]);

  const fetchReplies = async () => {
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          sender_id,
          created_at
        `)
        .eq("parent_id", parentMessageId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      // Get all unique sender IDs
      const senderIds = [...new Set(messagesData?.map(m => m.sender_id) || [])];

      // Get interpreter profiles
      const { data: interpreterProfiles, error: interpreterError } = await supabase
        .from("interpreter_profiles")
        .select("id, first_name, last_name")
        .in("id", senderIds);

      if (interpreterError) throw interpreterError;

      // Create a map of interpreter names
      const interpreterNames = new Map(
        interpreterProfiles?.map(p => [p.id, `${p.first_name} ${p.last_name}`])
      );

      // Combine messages with sender names
      const messagesWithNames = messagesData?.map(message => ({
        ...message,
        sender_name: interpreterNames.get(message.sender_id) || "Unknown User"
      }));

      setReplies(messagesWithNames || []);
    } catch (error) {
      console.error("Error fetching replies:", error);
      toast({
        title: "Error",
        description: "Failed to load replies",
        variant: "destructive",
      });
    }
  };

  const sendReply = async (content: string) => {
    if (!content.trim()) return;

    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("messages")
        .insert({
          parent_id: parentMessageId,
          content: content.trim(),
          sender_id: user.id,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error sending reply:", error);
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    replies,
    isLoading,
    sendReply
  };
};