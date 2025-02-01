import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
}

interface Admin {
  id: string;
  email: string;
}

export const MessagingTab = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
    const channel = subscribeToMessages();
    fetchAdmins();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAdmins = async () => {
    try {
      // First, get admin user_ids from user_roles
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

      // Then, get admin emails from auth.users using Edge Function
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

  const fetchMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
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

  const subscribeToMessages = () => {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return channel;
  };

  const sendMessage = async (adminId: string) => {
    if (!newMessage.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from("direct_messages").insert({
        content: newMessage.trim(),
        recipient_id: adminId,
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
    <div className="space-y-4">
      {admins.map((admin) => (
        <div key={admin.id} className="border rounded-lg p-4 space-y-4">
          <h3 className="font-medium">Chat avec {admin.email}</h3>
          <ScrollArea className="h-[300px] w-full pr-4">
            <div className="space-y-4">
              {messages
                .filter(
                  (msg) =>
                    (msg.sender_id === admin.id && msg.recipient_id === supabase.auth.user()?.id) ||
                    (msg.recipient_id === admin.id && msg.sender_id === supabase.auth.user()?.id)
                )
                .map((message) => (
                  <div
                    key={message.id}
                    className={`p-3 rounded-lg max-w-[80%] ${
                      message.recipient_id === admin.id
                        ? "bg-primary text-primary-foreground ml-auto"
                        : "bg-secondary"
                    }`}
                  >
                    {message.content}
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(message.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Tapez votre message..."
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  sendMessage(admin.id);
                }
              }}
            />
            <Button onClick={() => sendMessage(admin.id)}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};