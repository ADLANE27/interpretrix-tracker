
import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  created_at: string;
  channel_id: string;
  sender_id: string;
}

export const MessagesTab = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [channelId, setChannelId] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const getOrCreateGeneralChannel = async () => {
      try {
        // First, try to find the general channel
        let { data: channel, error } = await supabase
          .from('chat_channels')
          .select('id')
          .eq('name', 'general')
          .single();

        if (error) {
          // If not found, create it
          const { data: newChannel, error: createError } = await supabase
            .from('chat_channels')
            .insert({ 
              name: 'general',
              description: 'Canal général',
              created_by: 'system'
            })
            .select()
            .single();

          if (createError) throw createError;
          channel = newChannel;
        }

        setChannelId(channel.id);
        fetchMessages(channel.id);
      } catch (error) {
        console.error("Error setting up channel:", error);
        toast({
          title: "Error",
          description: "Failed to setup messaging channel",
          variant: "destructive",
        });
      }
    };

    getOrCreateGeneralChannel();
  }, []);

  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel("chat_messages")
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "chat_messages",
          filter: `channel_id=eq.${channelId}`
        },
        () => {
          if (channelId) fetchMessages(channelId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async (channelId: string) => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq('channel_id', channelId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to fetch messages",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !channelId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("chat_messages")
        .insert([{ 
          content: newMessage,
          channel_id: channelId,
          sender_id: user.id
        }]);

      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message) => (
          <Card key={message.id} className="p-4">
            <p>{message.content}</p>
            <p className="text-sm text-gray-500 mt-2">
              {format(new Date(message.created_at), "PPpp", { locale: fr })}
            </p>
          </Card>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1"
        />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
};
