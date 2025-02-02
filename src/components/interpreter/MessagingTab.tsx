import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageSquare, Send } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
  read_at: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
}

interface Admin {
  id: string;
  email: string;
}

interface ChatHistory {
  id: string;
  name: string;
  lastMessage?: string;
  unreadCount: number;
}

export const MessagingTab = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const initializeUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        fetchAdmins();
        fetchChatHistory();
      }
    };

    initializeUser();
  }, []);

  useEffect(() => {
    if (selectedAdmin) {
      fetchMessages(selectedAdmin);
      const channel = subscribeToMessages(selectedAdmin);
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedAdmin]);

  const fetchAdmins = async () => {
    try {
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .eq("active", true);

      if (rolesError) throw rolesError;

      if (!adminRoles?.length) {
        setAdmins([]);
        return;
      }

      const adminIds = adminRoles.map(role => role.user_id);
      const { data: adminData, error } = await supabase.functions.invoke('get-admin-emails', {
        body: { adminIds }
      });

      if (error) throw error;
      setAdmins(adminData || []);
    } catch (error) {
      console.error("Error fetching admins:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des administrateurs",
        variant: "destructive",
      });
    }
  };

  const fetchChatHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: messageUsers, error: msgError } = await supabase
        .from('direct_messages')
        .select('sender_id, recipient_id')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);

      if (msgError) throw msgError;

      const uniqueAdminIds = new Set<string>();
      messageUsers?.forEach(msg => {
        const otherId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        uniqueAdminIds.add(otherId);
      });

      const adminIds = Array.from(uniqueAdminIds);
      const { data: adminData, error } = await supabase.functions.invoke('get-admin-emails', {
        body: { adminIds }
      });

      if (error) throw error;

      const history: ChatHistory[] = adminData?.map((admin: Admin) => ({
        id: admin.id,
        name: admin.email,
        unreadCount: 0
      })) || [];

      setChatHistory(history);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique des conversations",
        variant: "destructive",
      });
    }
  };

  const fetchMessages = async (adminId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${adminId}),and(sender_id.eq.${adminId},recipient_id.eq.${user.id})`)
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

  const subscribeToMessages = (adminId: string) => {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
          filter: `or(and(sender_id.eq.${currentUserId},recipient_id.eq.${adminId}),and(sender_id.eq.${adminId},recipient_id.eq.${currentUserId}))`
        },
        (payload) => {
          console.log("Message update received:", payload);
          fetchMessages(adminId);
          fetchChatHistory();
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    return channel;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedAdmin) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from("direct_messages").insert({
        content: newMessage.trim(),
        recipient_id: selectedAdmin,
        sender_id: user.id,
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

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Sidebar with chat history */}
      <div className="w-64 bg-chat-sidebar flex flex-col h-full flex-shrink-0 border-r">
        <div className="p-4">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un administrateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400 px-2">Messages récents</h3>
              {chatHistory.map((chat) => (
                <Button
                  key={chat.id}
                  variant={selectedAdmin === chat.id ? "secondary" : "ghost"}
                  className="w-full justify-start text-left"
                  onClick={() => setSelectedAdmin(chat.id)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  <div className="flex flex-col items-start">
                    <span>{chat.name}</span>
                    {chat.lastMessage && (
                      <span className="text-xs text-gray-500 truncate">
                        {chat.lastMessage}
                      </span>
                    )}
                  </div>
                  {chat.unreadCount > 0 && (
                    <span className="ml-auto bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                      {chat.unreadCount}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedAdmin ? (
          <>
            {/* Chat Header */}
            <div className="h-14 border-b flex items-center px-4">
              <div className="font-medium">
                {chatHistory.find(c => c.id === selectedAdmin)?.name || 
                 admins.find(a => a.id === selectedAdmin)?.email}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.sender_id === currentUserId
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary'
                      }`}
                    >
                      {message.content}
                      <div className="text-xs opacity-70 mt-1">
                        {new Date(message.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Tapez votre message..."
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Sélectionnez un administrateur pour commencer une conversation
          </div>
        )}
      </div>
    </div>
  );
};