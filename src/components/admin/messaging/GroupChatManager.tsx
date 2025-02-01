import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Plus, UserPlus } from "lucide-react";
import { AddChannelMemberForm } from "./AddChannelMemberForm";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  members_count: number;
  created_at: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

export const GroupChatManager = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isNewChannelOpen, setIsNewChannelOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDescription, setNewChannelDescription] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchChannels();
    const channelsChannel = supabase
      .channel("channels-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channels" },
        () => {
          fetchChannels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelsChannel);
    };
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel);
      const messagesChannel = supabase
        .channel("messages-updates")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `channel_id=eq.${selectedChannel}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesChannel);
      };
    }
  }, [selectedChannel]);

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error("Error fetching channels:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les canaux de discussion",
        variant: "destructive",
      });
    }
  };

  const fetchMessages = async (channelId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("channel_id", channelId)
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

  const createChannel = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from("channels").insert({
        name: newChannelName,
        description: newChannelDescription,
        type: "internal", // Changed from "group" to "internal"
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Le canal a été créé avec succès",
      });

      setNewChannelName("");
      setNewChannelDescription("");
      setIsNewChannelOpen(false);
    } catch (error) {
      console.error("Error creating channel:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le canal",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!selectedChannel || !newMessage.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from("messages").insert({
        content: newMessage.trim(),
        channel_id: selectedChannel,
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Discussions de groupe</h2>
        <Dialog open={isNewChannelOpen} onOpenChange={setIsNewChannelOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau canal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouveau canal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="channel-name">Nom du canal</Label>
                <Input
                  id="channel-name"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="Entrez le nom du canal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel-description">Description</Label>
                <Textarea
                  id="channel-description"
                  value={newChannelDescription}
                  onChange={(e) => setNewChannelDescription(e.target.value)}
                  placeholder="Entrez une description pour le canal"
                />
              </div>
              <Button
                onClick={createChannel}
                disabled={!newChannelName.trim()}
                className="w-full"
              >
                Créer le canal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <h3 className="font-medium">Canaux</h3>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedChannel === channel.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80"
                  }`}
                  onClick={() => setSelectedChannel(channel.id)}
                >
                  <div className="font-medium">{channel.name}</div>
                  {channel.description && (
                    <div className="text-sm opacity-80">{channel.description}</div>
                  )}
                  <div className="text-xs mt-1">
                    {channel.members_count} membre{channel.members_count > 1 ? "s" : ""}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {selectedChannel && (
          <div className="md:col-span-2 border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">
                {channels.find((c) => c.id === selectedChannel)?.name}
              </h3>
              <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Ajouter un membre
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ajouter un membre au canal</DialogTitle>
                  </DialogHeader>
                  <AddChannelMemberForm
                    channelId={selectedChannel}
                    onSuccess={() => setIsAddMemberOpen(false)}
                    onCancel={() => setIsAddMemberOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="p-3 rounded-lg bg-secondary max-w-[80%]"
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
    </div>
  );
};