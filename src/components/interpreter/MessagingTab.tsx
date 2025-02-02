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
import { Button } from "@/components/ui/button";

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
  channel_id?: string | null;  // Made optional with ?
  recipient_id: string | null;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
}

interface Interpreter {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface ChatHistory {
  id: string;
  name: string;
  lastMessage?: string;
  unreadCount: number;
}

export const MessagingTab = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [senderProfiles, setSenderProfiles] = useState<Record<string, { first_name: string; last_name: string; id: string; }>>({});
  const [interpreters, setInterpreters] = useState<Interpreter[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [selectedInterpreter, setSelectedInterpreter] = useState<string | null>(null);
  const [directMessages, setDirectMessages] = useState<Message[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const initializeUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        fetchChannels();
        fetchChatHistory();
      }
    };

    initializeUser();
  }, []);

  const fetchChatHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: messageUsers, error: msgError } = await supabase
        .from('direct_messages')
        .select('sender_id, recipient_id')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);

      if (msgError) throw msgError;

      const uniqueInterpreterIds = new Set<string>();
      messageUsers?.forEach(msg => {
        const otherId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        uniqueInterpreterIds.add(otherId);
      });

      const { data: profiles, error: profileError } = await supabase
        .from('interpreter_profiles')
        .select('id, first_name, last_name')
        .in('id', Array.from(uniqueInterpreterIds));

      if (profileError) throw profileError;

      const history: ChatHistory[] = profiles?.map(profile => ({
        id: profile.id,
        name: `${profile.first_name} ${profile.last_name}`,
        unreadCount: 0
      })) || [];

      setChatHistory(history);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique des conversations",
        variant: "destructive",
      });
    }
  };

  const fetchDirectMessages = async (interpreterId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${interpreterId}),and(sender_id.eq.${interpreterId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setDirectMessages(data || []);
    } catch (error) {
      console.error("Error fetching direct messages:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les messages",
        variant: "destructive",
      });
    }
  };

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
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      console.log('Successfully fetched channel messages:', messages);
      
      // Get unique sender IDs
      const senderIds = [...new Set((messages || []).map(msg => msg.sender_id))];
      
      // Create a map to store all sender profiles
      const profileMap: Record<string, { first_name: string; last_name: string; id: string; }> = {};

      // First, try to fetch interpreter profiles
      const { data: interpreterProfiles, error: interpreterError } = await supabase
        .from('interpreter_profiles')
        .select('id, first_name, last_name')
        .in('id', senderIds);

      if (interpreterError) {
        console.error('Error fetching interpreter profiles:', interpreterError);
      }

      // Add interpreter profiles to the map
      if (interpreterProfiles) {
        interpreterProfiles.forEach(profile => {
          profileMap[profile.id] = {
            id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name
          };
        });
      }

      // For senders without interpreter profiles (likely admins), fetch from auth.users
      const remainingSenderIds = senderIds.filter(id => !profileMap[id]);
      
      if (remainingSenderIds.length > 0) {
        for (const senderId of remainingSenderIds) {
          try {
            const { data, error } = await supabase.functions.invoke('get-user-info', {
              body: { userId: senderId }
            });

            if (error) {
              console.error('Error fetching user info:', error);
              continue;
            }

            profileMap[senderId] = {
              id: senderId,
              first_name: data.first_name || 'Admin',
              last_name: data.last_name || ''
            };
          } catch (error) {
            console.error('Error fetching admin user info:', error);
          }
        }
      }

      setSenderProfiles(profileMap);
      setMessages(messages || []);
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

  const sendDirectMessage = async (content: string) => {
    if (!content.trim() || !selectedInterpreter) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from("direct_messages").insert({
        content: content.trim(),
        recipient_id: selectedInterpreter,
        sender_id: user.id,
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error sending direct message:", error);
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
    if (selectedInterpreter) {
      fetchDirectMessages(selectedInterpreter);
      
      const channel = supabase
        .channel(`direct-messages-${selectedInterpreter}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'direct_messages',
            filter: `or(and(sender_id.eq.${currentUserId},recipient_id.eq.${selectedInterpreter}),and(sender_id.eq.${selectedInterpreter},recipient_id.eq.${currentUserId}))`,
          },
          (payload) => {
            console.log('Direct message update received:', payload);
            fetchDirectMessages(selectedInterpreter);
          }
        )
        .subscribe((status) => {
          console.log('Direct messages subscription status:', status);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedInterpreter, currentUserId]);

  return (
    <Tabs defaultValue="groups" className="h-[calc(100vh-4rem)] flex">
      <div className="w-64 bg-chat-sidebar flex flex-col h-full flex-shrink-0 border-r">
        <div className="p-4">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="groups" className="flex-1">
              <Users className="h-4 w-4 mr-2" />
              Groupes
            </TabsTrigger>
            <TabsTrigger value="direct" className="flex-1">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages directs
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
                onSelectChannel={(channelId) => {
                  setSelectedChannel(channelId);
                  setSelectedInterpreter(null);
                }}
              />
            </TabsContent>
            <TabsContent value="direct" className="m-0">
              <div className="space-y-2">
                {/* Search Results */}
                {searchTerm && interpreters.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <h3 className="text-sm font-medium text-gray-400 px-2">Résultats</h3>
                    {interpreters.map((interpreter) => (
                      <Button
                        key={interpreter.id}
                        variant="ghost"
                        className="w-full justify-start text-left"
                        onClick={() => {
                          setSelectedInterpreter(interpreter.id);
                          setSelectedChannel(null);
                          setSearchTerm("");
                          setInterpreters([]);
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {interpreter.first_name} {interpreter.last_name}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Chat History */}
                {!searchTerm && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-400 px-2">Messages récents</h3>
                    {chatHistory.map((chat) => (
                      <Button
                        key={chat.id}
                        variant={selectedInterpreter === chat.id ? "secondary" : "ghost"}
                        className="w-full justify-start text-left"
                        onClick={() => {
                          setSelectedInterpreter(chat.id);
                          setSelectedChannel(null);
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        <div className="flex flex-col items-start">
                          <span>{chat.name}</span>
                          {chat.lastMessage && (
                            <span className="text-xs text-gray-500 truncate">
                              {chat.lastMessage}
                            </span>
                          )}
                        </div>
                        {chat.unreadCount > 0 && (
                          <span className="ml-auto bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                            {chat.unreadCount}
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        {selectedChannel || selectedInterpreter ? (
          <>
            <div className="h-14 border-b flex items-center px-4">
              <div className="font-medium">
                {selectedChannel 
                  ? channels.find(c => c.id === selectedChannel)?.name
                  : chatHistory.find(c => c.id === selectedInterpreter)?.name || 
                    interpreters.find(i => i.id === selectedInterpreter)?.first_name + ' ' + 
                    interpreters.find(i => i.id === selectedInterpreter)?.last_name
                }
              </div>
            </div>

            <MessageList
              messages={selectedChannel ? messages : directMessages}
              currentUserId={currentUserId}
              senderProfiles={senderProfiles}
              onDeleteMessage={deleteMessage}
            />

            <MessageInput
              onSendMessage={selectedChannel ? sendMessage : sendDirectMessage}
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
