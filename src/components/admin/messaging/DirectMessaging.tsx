import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InterpreterSelector } from "./components/InterpreterSelector";
import { MessageList } from "./components/MessageList";
import { MessageInput } from "./components/MessageInput";
import { MessageActions } from "./components/MessageActions";
import { useMessages } from "./hooks/useMessages";

interface Interpreter {
  id: string;
  first_name: string;
  last_name: string;
}

interface UnreadCount {
  [interpreterId: string]: number;
}

export const DirectMessaging = () => {
  const [interpreters, setInterpreters] = useState<Interpreter[]>([]);
  const [selectedInterpreter, setSelectedInterpreter] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount>({});
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const {
    messages,
    editingMessage,
    editContent,
    setEditingMessage,
    setEditContent,
    fetchMessages,
    sendMessage,
    updateMessage,
    deleteMessage,
    deleteAllMessages,
  } = useMessages();

  useEffect(() => {
    fetchInterpreters();
    subscribeToNewMessages();
  }, []);

  useEffect(() => {
    if (selectedInterpreter) {
      fetchMessages(selectedInterpreter);
      const channel = subscribeToMessages(selectedInterpreter);
      markMessagesAsRead(selectedInterpreter);
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedInterpreter]);

  const fetchInterpreters = async () => {
    try {
      const { data, error } = await supabase
        .from("interpreter_profiles")
        .select("id, first_name, last_name");

      if (error) throw error;
      setInterpreters(data || []);
    } catch (error) {
      console.error("Error fetching interpreters:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des interprètes",
        variant: "destructive",
      });
    }
  };

  const subscribeToNewMessages = () => {
    const channel = supabase
      .channel('new-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        async (payload) => {
          const message = payload.new as any;
          const { data: { user } } = await supabase.auth.getUser();
          
          if (message.recipient_id === user?.id) {
            const sender = interpreters.find(i => i.id === message.sender_id);
            if (sender) {
              toast({
                title: `New message from ${sender.first_name} ${sender.last_name}`,
                description: message.content,
              });
              
              setUnreadCounts(prev => ({
                ...prev,
                [message.sender_id]: (prev[message.sender_id] || 0) + 1
              }));
            }
          }
        }
      )
      .subscribe();

    return channel;
  };

  const subscribeToMessages = (interpreterId: string) => {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            fetchMessages(interpreterId);
          } else if (payload.eventType === "UPDATE") {
            fetchMessages(interpreterId);
          } else if (payload.eventType === "DELETE") {
            fetchMessages(interpreterId);
          }
        }
      )
      .subscribe();

    return channel;
  };

  const markMessagesAsRead = async (senderId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('mark_messages_as_read', {
        p_recipient_id: user.id,
        p_sender_id: senderId
      });

      if (error) throw error;
      
      setUnreadCounts(prev => ({
        ...prev,
        [senderId]: 0
      }));
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const handleSendMessage = async (attachmentUrl?: string, attachmentName?: string) => {
    if (!selectedInterpreter || (!newMessage.trim() && !attachmentUrl)) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from("direct_messages").insert({
        content: newMessage.trim(),
        recipient_id: selectedInterpreter,
        sender_id: user.id,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
      });

      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    }
  };

  const filteredMessages = messages.filter((message) =>
    message.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <InterpreterSelector
        interpreters={interpreters}
        selectedInterpreter={selectedInterpreter}
        unreadCounts={unreadCounts}
        onSelectInterpreter={setSelectedInterpreter}
      />

      {selectedInterpreter && (
        <div className="border rounded-lg p-4 space-y-4">
          <MessageActions
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onDeleteAll={() => deleteAllMessages(selectedInterpreter)}
            isDeleteDialogOpen={isDeleteAllDialogOpen}
            setIsDeleteDialogOpen={setIsDeleteAllDialogOpen}
          />

          <MessageList
            messages={filteredMessages}
            selectedInterpreter={selectedInterpreter}
            editingMessage={editingMessage}
            editContent={editContent}
            onEditStart={(messageId, content) => {
              setEditingMessage(messageId);
              setEditContent(content);
            }}
            onEditCancel={() => {
              setEditingMessage(null);
              setEditContent("");
            }}
            onEditSave={(messageId) => updateMessage(messageId, editContent)}
            onEditChange={setEditContent}
            onDeleteMessage={deleteMessage}
          />

          <MessageInput
            value={newMessage}
            onChange={setNewMessage}
            onSend={handleSendMessage}
          />
        </div>
      )}
    </div>
  );
};
