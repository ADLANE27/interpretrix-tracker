import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateChannelDialog } from "./components/CreateChannelDialog";
import { ChannelMessages } from "./components/ChannelMessages";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  members_count: number;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_name?: string;
}

export const TeamChat = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchChannels();
    getCurrentUser();
    const messageChannel = subscribeToMessages();
    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages();
    }
  }, [selectedChannel]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchChannels = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: memberChannels, error: memberError } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const channelIds = memberChannels?.map(m => m.channel_id) || [];
      const { data: channels, error } = await supabase
        .from('channels')
        .select('*')
        .in('id', channelIds);

      if (error) throw error;
      setChannels(channels || []);
    } catch (error) {
      console.error('Error fetching channels:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les canaux",
        variant: "destructive",
      });
    }
  };

  const fetchMessages = async () => {
    if (!selectedChannel) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          sender_id,
          created_at,
          interpreter_profiles!inner (
            first_name,
            last_name
          )
        `)
        .eq('channel_id', selectedChannel)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages = data.map(message => ({
        ...message,
        sender_name: `${message.interpreter_profiles.first_name} ${message.interpreter_profiles.last_name}`
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
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
          table: "messages",
          filter: `channel_id=eq.${selectedChannel}`,
        },
        (payload) => {
          const newMessage = payload.new;
          fetchMessages(); // Refresh messages when a new one arrives
        }
      )
      .subscribe();

    return channel;
  };

  const sendMessage = async () => {
    if (!selectedChannel || !newMessage.trim() || !currentUserId) return;

    try {
      const { error } = await supabase.from("messages").insert({
        channel_id: selectedChannel,
        sender_id: currentUserId,
        content: newMessage.trim(),
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

  const handleCreateChannelSuccess = () => {
    setIsCreateChannelOpen(false);
    fetchChannels();
    toast({
      title: "Succès",
      description: "Canal créé avec succès",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Chat d'équipe</h2>
        <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
          <DialogTrigger asChild>
            <Button>Créer un canal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouveau canal</DialogTitle>
            </DialogHeader>
            <CreateChannelDialog 
              onClose={() => setIsCreateChannelOpen(false)}
              onSuccess={handleCreateChannelSuccess}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1 border rounded-lg p-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {channels.map((channel) => (
                <Button
                  key={channel.id}
                  variant={selectedChannel === channel.id ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setSelectedChannel(channel.id)}
                >
                  <div>
                    <div className="font-medium">{channel.name}</div>
                    <div className="text-xs text-gray-500">
                      {channel.members_count} membres
                    </div>
                  </div>
                </Button>
              ))}
              {channels.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  Aucun canal disponible
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="col-span-3 border rounded-lg p-4">
          {selectedChannel ? (
            <div className="h-full flex flex-col">
              <ScrollArea className="flex-1 pr-4 mb-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg max-w-[80%] ${
                        message.sender_id === currentUserId
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-secondary mr-auto"
                      }`}
                    >
                      <div className="text-xs font-medium mb-1">
                        {message.sender_name}
                      </div>
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
                      sendMessage();
                    }
                  }}
                />
                <Button onClick={sendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Sélectionnez un canal pour commencer à discuter
            </div>
          )}
        </div>
      </div>
    </div>
  );
};