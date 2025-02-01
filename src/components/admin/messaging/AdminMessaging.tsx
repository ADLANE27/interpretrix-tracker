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

interface Interpreter {
  id: string;
  first_name: string;
  last_name: string;
}

export const AdminMessaging = () => {
  const [interpreters, setInterpreters] = useState<Interpreter[]>([]);
  const [selectedInterpreter, setSelectedInterpreter] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchInterpreters();
  }, []);

  useEffect(() => {
    if (selectedInterpreter) {
      fetchMessages(selectedInterpreter);
      subscribeToMessages(selectedInterpreter);
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

  const fetchMessages = async (interpreterId: string) => {
    try {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`sender_id.eq.${interpreterId},recipient_id.eq.${interpreterId}`)
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

  const subscribeToMessages = (interpreterId: string) => {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
          filter: `sender_id=eq.${interpreterId},recipient_id=eq.${interpreterId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!selectedInterpreter || !newMessage.trim()) return;

    try {
      const { error } = await supabase.from("direct_messages").insert({
        content: newMessage.trim(),
        recipient_id: selectedInterpreter,
        sender_id: (await supabase.auth.getUser()).data.user?.id,
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
      <div className="flex gap-2 flex-wrap">
        {interpreters.map((interpreter) => (
          <Button
            key={interpreter.id}
            variant={selectedInterpreter === interpreter.id ? "default" : "outline"}
            onClick={() => setSelectedInterpreter(interpreter.id)}
          >
            {interpreter.first_name} {interpreter.last_name}
          </Button>
        ))}
      </div>

      {selectedInterpreter && (
        <div className="border rounded-lg p-4 space-y-4">
          <ScrollArea className="h-[400px] w-full pr-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg max-w-[80%] ${
                    message.sender_id === selectedInterpreter
                      ? "bg-secondary ml-auto"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {message.content}
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
                  sendMessage();
                }
              }}
            />
            <Button onClick={sendMessage}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};