
import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { ChannelMemberManagement } from "./ChannelMemberManagement";
import { PlusCircle, Settings } from "lucide-react";

interface Message {
  id: string;
  content: string;
  created_at: string;
  channel_id: string;
  sender_id: string;
}

interface Channel {
  id: string;
  name: string;
  description: string | null;
}

export const MessagesTab = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch channels
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_channels')
          .select('*')
          .order('name');

        if (error) throw error;
        setChannels(data);
        
        // Select the first channel by default if none is selected
        if (data.length > 0 && !selectedChannel) {
          setSelectedChannel(data[0]);
        }
      } catch (error) {
        console.error("Error fetching channels:", error);
        toast({
          title: "Error",
          description: "Failed to fetch channels",
          variant: "destructive",
        });
      }
    };

    fetchChannels();
  }, [selectedChannel]);

  // Subscribe to messages for the selected channel
  useEffect(() => {
    if (!selectedChannel) return;

    const channel = supabase
      .channel("chat_messages")
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "chat_messages",
          filter: `channel_id=eq.${selectedChannel.id}`
        },
        () => {
          fetchMessages(selectedChannel.id);
        }
      )
      .subscribe();

    fetchMessages(selectedChannel.id);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChannel]);

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
    if (!newMessage.trim() || !selectedChannel) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("chat_messages")
        .insert([{ 
          content: newMessage,
          channel_id: selectedChannel.id,
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
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Channels List */}
      <div className="w-64 flex flex-col border-r pr-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Channels</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowCreateDialog(true)}
            className="h-8 w-8"
          >
            <PlusCircle className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-accent ${
                selectedChannel?.id === channel.id ? 'bg-accent' : ''
              }`}
              onClick={() => setSelectedChannel(channel)}
            >
              <span className="truncate">{channel.name}</span>
              {selectedChannel?.id === channel.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMemberManagement(true);
                  }}
                  className="h-8 w-8"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
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
                placeholder={`Message #${selectedChannel.name}`}
                className="flex-1"
              />
              <Button type="submit">Send</Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a channel to start messaging
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateChannelDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {selectedChannel && (
        <ChannelMemberManagement
          open={showMemberManagement}
          onOpenChange={setShowMemberManagement}
          channelId={selectedChannel.id}
        />
      )}
    </div>
  );
};
