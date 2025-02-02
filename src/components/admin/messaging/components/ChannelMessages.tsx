import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare } from "lucide-react";
import { ThreadView } from "./ThreadView";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_name: string;
  reply_count: number;
}

interface ChannelMessagesProps {
  channelId: string;
}

export const ChannelMessages = ({ channelId }: ChannelMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initializeUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };

    initializeUser();
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
        () => {
          fetchMessages();
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

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          sender_id,
          created_at
        `)
        .eq("channel_id", channelId)
        .is("parent_id", null)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      // Get reply counts using count aggregate
      const { data: replyCounts, error: replyCountsError } = await supabase
        .from("messages")
        .select('parent_id, count')
        .not('parent_id', 'is', null)
        .eq('channel_id', channelId)
        .groupBy('parent_id');

      if (replyCountsError) throw replyCountsError;

      // Create a map of reply counts
      const replyCountMap = new Map();
      replyCounts?.forEach(row => {
        replyCountMap.set(row.parent_id, parseInt(row.count.toString()));
      });

      // Get interpreter profiles
      const { data: interpreterProfiles, error: interpreterError } = await supabase
        .from("interpreter_profiles")
        .select("id, first_name, last_name");

      if (interpreterError) throw interpreterError;

      // Create a map of interpreter names
      const interpreterNames = new Map(
        interpreterProfiles?.map(p => [p.id, `${p.first_name} ${p.last_name}`])
      );

      // Combine messages with sender names and reply counts
      const messagesWithDetails = messagesData?.map(message => ({
        ...message,
        sender_name: interpreterNames.get(message.sender_id) || "Unknown User",
        reply_count: replyCountMap.get(message.id) || 0
      }));

      setMessages(messagesWithDetails || []);
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
    <div className="h-[600px] grid grid-cols-3 gap-4">
      <div className={`col-span-${selectedThread ? '2' : '3'} flex flex-col`}>
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => {
              const isCurrentUser = message.sender_id === currentUserId;
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
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{new Date(message.created_at).toLocaleString()}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => setSelectedThread(message)}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {message.reply_count > 0 && (
                        <span>{message.reply_count}</span>
                      )}
                    </Button>
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

      {selectedThread && (
        <div className="col-span-1 border-l">
          <ThreadView
            parentMessage={selectedThread}
            onClose={() => setSelectedThread(null)}
          />
        </div>
      )}
    </div>
  );
};