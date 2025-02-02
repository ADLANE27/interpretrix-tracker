import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InterpreterSelector } from "./components/InterpreterSelector";
import { MessageList } from "./components/MessageList";
import { MessageInput } from "./components/MessageInput";
import { MessageActions } from "./components/MessageActions";
import { useMessages } from "./hooks/useMessages";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoreVertical, Search } from "lucide-react";

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
  const [filteredInterpreters, setFilteredInterpreters] = useState<Interpreter[]>([]);
  const [selectedInterpreter, setSelectedInterpreter] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount>({});
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  useEffect(() => {
    // Only fetch interpreters when there's a search term
    if (searchTerm.length >= 2) {
      fetchInterpreters();
    } else {
      setFilteredInterpreters([]);
    }
  }, [searchTerm]);

  const fetchInterpreters = async () => {
    try {
      const { data, error } = await supabase
        .from("interpreter_profiles")
        .select("id, first_name, last_name")
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`);

      if (error) throw error;
      setInterpreters(data || []);
      setFilteredInterpreters(data || []);
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

  const handleSendMessage = async (content: string, file?: File) => {
    if (!selectedInterpreter || (!content.trim() && !file)) return;
    
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      let attachment_url = null;
      let attachment_name = null;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('message_attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('message_attachments')
          .getPublicUrl(fileName);

        attachment_url = publicUrl;
        attachment_name = file.name;
      }

      const { error } = await supabase.from("direct_messages").insert({
        content: content.trim(),
        recipient_id: selectedInterpreter,
        sender_id: user.id,
        attachment_url,
        attachment_name,
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Sidebar */}
      <div className="w-64 bg-chat-sidebar flex flex-col h-full flex-shrink-0">
        <div className="p-4">
          <div className="flex items-center justify-between text-white mb-4">
            <h2 className="text-lg font-semibold">Direct Messages</h2>
          </div>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un interprète..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <InterpreterSelector
            interpreters={filteredInterpreters}
            selectedInterpreter={selectedInterpreter}
            unreadCounts={unreadCounts}
            onSelectInterpreter={setSelectedInterpreter}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white h-full">
        {selectedInterpreter ? (
          <>
            <div className="h-14 border-b border-chat-channelBorder flex items-center justify-between px-4 bg-chat-channelHeader">
              <div className="flex items-center space-x-2">
                <span className="font-medium">
                  {interpreters.find(i => i.id === selectedInterpreter)?.first_name} {interpreters.find(i => i.id === selectedInterpreter)?.last_name}
                </span>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5 text-gray-500" />
              </Button>
            </div>

            <div className="flex-1 flex flex-col">
              <MessageActions
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onDeleteAll={() => deleteAllMessages(selectedInterpreter)}
                isDeleteDialogOpen={isDeleteAllDialogOpen}
                setIsDeleteDialogOpen={setIsDeleteAllDialogOpen}
              />

              <ScrollArea className="flex-1 px-4">
                <MessageList
                  messages={messages.filter((message) =>
                    message.content.toLowerCase().includes(searchTerm.toLowerCase())
                  )}
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
              </ScrollArea>

              <div className="p-4 border-t">
                <MessageInput
                  value={newMessage}
                  onChange={setNewMessage}
                  onSend={handleSendMessage}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select an interpreter to start chatting
          </div>
        )}
      </div>
    </div>
  );
};