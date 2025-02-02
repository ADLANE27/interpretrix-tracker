import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageSquare, Users } from "lucide-react";
import { MessageList } from "./messages/MessageList";
import { MessageInput } from "./messages/MessageInput";
import { ChannelList } from "./messages/ChannelList";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: 'internal' | 'external' | 'mixed' | 'admin_only';
  members_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  channel_id: string;
  recipient_id: string | null;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
}

export const MessagingTab = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [senderProfiles, setSenderProfiles] = useState<Record<string, { first_name: string; last_name: string }>>({});
  const { toast } = useToast();

  useEffect(() => {
    const initializeUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        fetchChannels();
      }
    };

    initializeUser();
  }, []);

  const fetchChannels = async () => {
    try {
      console.log('Fetching channels...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberChannels, error: memberError } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const channelIds = memberChannels?.map(m => m.channel_id) || [];
      console.log('Found channel IDs:', channelIds);

      if (channelIds.length === 0) {
        setChannels([]);
        return;
      }

      const { data: channels, error } = await supabase
        .from('channels')
        .select('*')
        .in('id', channelIds);

      if (error) throw error;

      console.log('Successfully fetched channels:', channels);
      setChannels(channels || []);
    } catch (error) {
      console.error('Error in fetchChannels:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les canaux",
        variant: "destructive",
      });
    }
  };

  const fetchChannelMessages = async (channelId: string) => {
    try {
      console.log('Fetching messages for channel:', channelId);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      console.log('Successfully fetched channel messages:', data);
      
      const senderIds = [...new Set(data?.map(msg => msg.sender_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from('interpreter_profiles')
        .select('id, first_name, last_name')
        .in('id', senderIds);

      if (profilesError) throw profilesError;

      const profileMap = (profiles || []).reduce((acc, profile) => ({
        ...acc,
        [profile.id]: profile
      }), {});

      setSenderProfiles(profileMap);
      setMessages(data || []);
    } catch (error) {
      console.error('Error in fetchChannelMessages:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les messages du canal",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !selectedChannel) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from("messages").insert({
        content: content.trim(),
        channel_id: selectedChannel,
        sender_id: user.id,
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedChannel) return;

    try {
      setIsUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message_attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('message_attachments')
        .getPublicUrl(filePath);

      const { error: messageError } = await supabase.from("messages").insert({
        channel_id: selectedChannel,
        sender_id: user.id,
        content: "",
        attachment_url: publicUrl,
        attachment_name: file.name
      });

      if (messageError) throw messageError;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le fichier",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;

      toast({
        title: "Message supprimé",
        description: "Le message a été supprimé avec succès",
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le message",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (selectedChannel) {
      fetchChannelMessages(selectedChannel);
      
      const channel = supabase
        .channel(`channel-${selectedChannel}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `channel_id=eq.${selectedChannel}`,
          },
          (payload) => {
            console.log('Channel message update received:', payload);
            fetchChannelMessages(selectedChannel);
          }
        )
        .subscribe((status) => {
          console.log('Channel messages subscription status:', status);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedChannel]);

  return (
    <Tabs defaultValue="groups" className="h-[calc(100vh-4rem)] flex">
      <div className="w-64 bg-chat-sidebar flex flex-col h-full flex-shrink-0 border-r">
        <div className="p-4">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="groups" className="flex-1">
              <Users className="h-4 w-4 mr-2" />
              Groupes
            </TabsTrigger>
          </TabsList>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <TabsContent value="groups" className="m-0">
              <ChannelList
                channels={channels}
                selectedChannel={selectedChannel}
                onSelectChannel={setSelectedChannel}
              />
            </TabsContent>
          </ScrollArea>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        {selectedChannel ? (
          <>
            <div className="h-14 border-b flex items-center px-4">
              <div className="font-medium">
                {channels.find(c => c.id === selectedChannel)?.name}
              </div>
            </div>

            <MessageList
              messages={messages}
              currentUserId={currentUserId}
              senderProfiles={senderProfiles}
              onDeleteMessage={deleteMessage}
            />

            <MessageInput
              onSendMessage={sendMessage}
              onFileUpload={handleFileUpload}
              isUploading={isUploading}
            />
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Sélectionnez une conversation pour commencer
          </div>
        )}
      </div>
    </Tabs>
  );
};