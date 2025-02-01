import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Users, MessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

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

interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: 'admin_only' | 'internal' | 'external' | 'mixed';
}

export const MessagingTab = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [channelMessages, setChannelMessages] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
    fetchChannels();
    const messageChannel = subscribeToMessages();
    const channelMessagesSubscription = subscribeToChannelMessages();
    fetchAdmins();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(channelMessagesSubscription);
    };
  }, []);

  const fetchChannels = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: memberChannels, error: memberError } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      if (!memberChannels?.length) {
        setChannels([]);
        return;
      }

      const channelIds = memberChannels.map(m => m.channel_id);

      const { data: channels, error } = await supabase
        .from('channels')
        .select('*')
        .in('id', channelIds);

      if (error) throw error;
      setChannels(channels || []);
    } catch (error) {
      console.error("Error fetching channels:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les canaux",
        variant: "destructive",
      });
    }
  };

  const fetchChannelMessages = async (channelId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:sender_id(email)')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChannelMessages(data || []);
    } catch (error) {
      console.error("Error fetching channel messages:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les messages du canal",
        variant: "destructive",
      });
    }
  };

  const subscribeToChannelMessages = () => {
    const channel = supabase
      .channel('channel-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${selectedChannel}`,
        },
        (payload) => {
          console.log('New channel message:', payload);
          if (selectedChannel) {
            fetchChannelMessages(selectedChannel);
          }
        }
      )
      .subscribe();

    return channel;
  };

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

  const sendChannelMessage = async () => {
    if (!newMessage.trim() || !selectedChannel) return;

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
      console.error("Error sending channel message:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    }
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
    <Tabs defaultValue="direct" className="w-full">
      <TabsList>
        <TabsTrigger value="direct" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Messages Directs
        </TabsTrigger>
        <TabsTrigger value="group" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Canaux de Groupe
        </TabsTrigger>
      </TabsList>

      <TabsContent value="direct">
        {admins.map((admin) => (
          <div key={admin.id} className="border rounded-lg p-4 space-y-4 mb-4">
            <h3 className="font-medium">Chat avec {admin.email}</h3>
            <ScrollArea className="h-[300px] w-full pr-4">
              <div className="space-y-4">
                {messages
                  .filter((msg) => 
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
      </TabsContent>

      <TabsContent value="group">
        <div className="grid grid-cols-4 gap-4">
          <Card className="col-span-1 p-4">
            <h3 className="font-medium mb-4">Mes Canaux</h3>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {channels.map((channel) => (
                  <Button
                    key={channel.id}
                    variant={selectedChannel === channel.id ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedChannel(channel.id);
                      fetchChannelMessages(channel.id);
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {channel.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </Card>

          <Card className="col-span-3 p-4">
            {selectedChannel ? (
              <div className="h-full flex flex-col">
                <ScrollArea className="flex-1 pr-4 mb-4">
                  <div className="space-y-4">
                    {channelMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg max-w-[80%] ${
                          message.sender_id === supabase.auth.user()?.id
                            ? "bg-primary text-primary-foreground ml-auto"
                            : "bg-secondary"
                        }`}
                      >
                        <div className="text-xs font-medium mb-1">
                          {message.sender?.email}
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
                        sendChannelMessage();
                      }
                    }}
                  />
                  <Button onClick={sendChannelMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Sélectionnez un canal pour commencer à discuter
              </div>
            )}
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
};
