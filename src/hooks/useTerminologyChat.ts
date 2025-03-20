
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  TerminologyChat, 
  TerminologyChatMessage, 
  TerminologyChatRequest,
  TerminologyChatResponse
} from "@/types/terminology-chat";
import { useToast } from "@/hooks/use-toast";

export const useTerminologyChat = (userId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Query for fetching chat history
  const { data: chatHistory, isLoading: isChatsLoading } = useQuery({
    queryKey: ['terminology-chats', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('terminology_chats')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching chat history:", error);
        throw new Error(error.message);
      }

      return data as TerminologyChat[];
    },
    enabled: !!userId,
  });

  // Query for fetching messages for a specific chat
  const getChatMessages = (chatId?: string) => {
    return useQuery({
      queryKey: ['terminology-chat-messages', chatId],
      queryFn: async () => {
        if (!chatId) return [];
        
        const { data, error } = await supabase
          .from('terminology_chat_messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error("Error fetching chat messages:", error);
          throw new Error(error.message);
        }

        return data as TerminologyChatMessage[];
      },
      enabled: !!chatId,
    });
  };

  // Mutation for sending a message
  const sendMessageMutation = useMutation({
    mutationFn: async (request: TerminologyChatRequest): Promise<TerminologyChatResponse> => {
      setIsLoading(true);
      console.log("Sending chat message:", request);
      
      try {
        const response = await supabase.functions.invoke('terminology-chat', {
          body: request,
        });

        console.log("Chat response:", response);

        if (response.error) {
          console.error("Chat error:", response.error);
          throw new Error(response.error.message || "Error communicating with the terminology assistant");
        }

        if (!response.data) {
          console.error("Chat returned no data");
          throw new Error("No response received from the terminology assistant");
        }

        if (response.data.error) {
          console.error("Chat returned error in data:", response.data.error);
          throw new Error(response.data.error);
        }

        return response.data as TerminologyChatResponse;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: (data, variables) => {
      console.log("Message sent successfully:", data);
      
      // Ensure we have the message and messageId before invalidating queries
      if (data.message && data.chatId) {
        // Invalidate queries to refresh the chat lists and messages
        queryClient.invalidateQueries({ queryKey: ['terminology-chats', userId] });
        queryClient.invalidateQueries({ queryKey: ['terminology-chat-messages', data.chatId] });
        
        toast({
          title: "Message envoyé",
          description: "L'assistant a répondu à votre message",
          variant: "default"
        });
      } else {
        console.error("Message sent but received incomplete response:", data);
        toast({
          title: "Attention",
          description: "Message envoyé mais la réponse pourrait être incomplète",
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      console.error("Error sending message:", error);
      
      toast({
        title: "Erreur",
        description: error.message || "Échec de l'envoi du message",
        variant: "destructive"
      });
    }
  });

  // Mutation for deleting a chat
  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      // First delete all messages
      const { error: messagesError } = await supabase
        .from('terminology_chat_messages')
        .delete()
        .eq('chat_id', chatId);
      
      if (messagesError) {
        throw new Error(`Error deleting chat messages: ${messagesError.message}`);
      }

      // Then delete the chat
      const { error: chatError } = await supabase
        .from('terminology_chats')
        .delete()
        .eq('id', chatId);
      
      if (chatError) {
        throw new Error(`Error deleting chat: ${chatError.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminology-chats', userId] });
      
      toast({
        title: "Chat supprimé",
        description: "La conversation a été supprimée",
        variant: "default"
      });
    },
    onError: (error: Error) => {
      console.error("Error deleting chat:", error);
      
      toast({
        title: "Erreur",
        description: error.message || "Échec de la suppression de la conversation",
        variant: "destructive"
      });
    }
  });

  return {
    chatHistory,
    getChatMessages,
    sendMessage: (request: Omit<TerminologyChatRequest, 'userId'>) => {
      if (!userId) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour envoyer des messages",
          variant: "destructive"
        });
        return Promise.reject(new Error("User not authenticated"));
      }
      return sendMessageMutation.mutateAsync({ ...request, userId });
    },
    deleteChat: (chatId: string) => deleteChatMutation.mutateAsync(chatId),
    isLoading,
    isChatsLoading
  };
};
