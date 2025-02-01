import { useState, useEffect, useRef } from "react";
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
  created_at: string;
  sender_name?: string;
}

interface ChannelMessagesProps {
  channelId: string;
}

export const ChannelMessages = ({ channelId }: ChannelMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel(`messages-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const fetchMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          sender_id,
          created_at
        `)
        .eq("channel_id", channelId)
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

      // Get user roles to identify admins
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", senderIds)
        .eq("role", "admin");

      if (rolesError) throw rolesError;

      // Create a map of interpreter names
      const interpreterNames = new Map(
        interpreterProfiles?.map(p => [p.id, `${p.first_name} ${p.last_name}`])
      );

      // For admin users, get their info from auth.users via Edge Function
      const adminIds = userRoles?.map(r => r.user_id) || [];
      const adminNames = new Map();

      if (adminIds.length > 0) {
        for (const adminId of adminIds) {
          const response = await supabase.functions.invoke('get-user-info', {
            body: { userId: adminId }
          });
          
          if (!response.error && response.data) {
            adminNames.set(
              adminId, 
              `${response.data.first_name || ''} ${response.data.last_name || ''}`
            );
          }
        }
      }

      // Combine messages with sender names
      const messagesWithNames = messagesData?.map(message => ({
        ...message,
        sender_name: interpreterNames.get(message.sender_id) || 
                    adminNames.get(message.sender_id) ||
                    "Unknown User"
      }));

      setMessages(messagesWithNames || []);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("messages")
        .insert({
          channel_id: channelId,
          content: newMessage.trim(),
          sender_id: user.id,
        });

      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[600px] flex flex-col">
      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => {
            const isCurrentUser = message.sender_id === supabase.auth.user()?.id;
            return (
              <div
                key={message.id}
                className={`flex flex-col space-y-1 ${
                  isCurrentUser ? 'items-end' : 'items-start'
                }`}
              >
                <div className="text-sm font-medium">
                  {message.sender_name}
                </div>
                <div 
                  className={`p-3 rounded-lg max-w-[80%] ${
                    isCurrentUser 
                      ? 'bg-interpreter-navy text-white' 
                      : 'bg-secondary'
                  }`}
                >
                  {message.content}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(message.created_at).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="flex gap-2 mt-4">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <Button onClick={sendMessage} disabled={isLoading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};