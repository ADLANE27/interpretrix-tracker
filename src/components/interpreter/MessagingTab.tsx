import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MessageSquare, Send, Users, Paperclip, Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';
import { useNavigate } from "react-router-dom";

interface DirectMessage {
  id: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
  read_at: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
}

interface ChannelMessage {
  id: string;
  content: string;
  sender_id: string;
  channel_id: string;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  parent_id?: string | null;
}

type Message = DirectMessage | ChannelMessage;

interface Admin {
  id: string;
  email: string;
}

interface ChatHistory {
  id: string;
  name: string;
  lastMessage?: string;
  unreadCount: number;
}

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

export const MessagingTab = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error("Auth error:", error);
          navigate("/login");
          return;
        }
        if (user) {
          setCurrentUserId(user.id);
          fetchAdmins();
          fetchChatHistory();
          fetchChannels(); // Add this line to fetch channels
        } else {
          navigate("/login");
        }
      } catch (error) {
        console.error("Error in initializeUser:", error);
        navigate("/login");
      }
    };

    initializeUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchChannels = async () => {
    try {
      console.log('Fetching channels...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return;
      }

      // First get channels where user is a member
      const { data: memberChannels, error: memberError } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', user.id);

      if (memberError) {
        console.error('Error fetching channel memberships:', memberError);
        throw memberError;
      }

      const channelIds = memberChannels?.map(m => m.channel_id) || [];
      console.log('Found channel IDs:', channelIds);

      if (channelIds.length === 0) {
        console.log('No channels found for user');
        setChannels([]);
        return;
      }

      // Then fetch the actual channels
      const { data: channels, error } = await supabase
        .from('channels')
        .select('*')
        .in('id', channelIds);

      if (error) {
        console.error('Error fetching channels:', error);
        throw error;
      }

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

  const fetchAdmins = async () => {
    try {
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

  const fetchChatHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: messageUsers, error: msgError } = await supabase
        .from('direct_messages')
        .select('sender_id, recipient_id')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);

      if (msgError) throw msgError;

      const uniqueAdminIds = new Set<string>();
      messageUsers?.forEach(msg => {
        const otherId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        uniqueAdminIds.add(otherId);
      });

      const adminIds = Array.from(uniqueAdminIds);
      
      const { data: adminProfiles, error: profileError } = await supabase
        .from('interpreter_profiles')
        .select('id, first_name, last_name')
        .in('id', adminIds);

      if (profileError) throw profileError;

      const history: ChatHistory[] = adminProfiles?.map((profile) => ({
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

  const fetchChannelMessages = async (channelId: string) => {
    try {
      console.log('Fetching messages for channel:', channelId);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching channel messages:', error);
        throw error;
      }

      console.log('Successfully fetched channel messages:', data);
      setMessages(data as Message[] || []);
    } catch (error) {
      console.error('Error in fetchChannelMessages:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les messages du canal",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !selectedAdmin && !selectedChannel) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      if (selectedChannel) {
        const { error } = await supabase.from("messages").insert({
          content: newMessage.trim(),
          channel_id: selectedChannel,
          sender_id: user.id,
        });

        if (error) throw error;
      } else if (selectedAdmin) {
        const { error } = await supabase.from("direct_messages").insert({
          content: newMessage.trim(),
          recipient_id: selectedAdmin,
          sender_id: user.id,
        });

        if (error) throw error;
      }

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

      if (selectedChannel) {
        const { error: messageError } = await supabase.from("messages").insert({
          channel_id: selectedChannel,
          sender_id: user.id,
          content: "",
          attachment_url: publicUrl,
          attachment_name: file.name
        });

        if (messageError) throw messageError;
      } else if (selectedAdmin) {
        const { error: messageError } = await supabase.from("direct_messages").insert({
          recipient_id: selectedAdmin,
          sender_id: user.id,
          content: "",
          attachment_url: publicUrl,
          attachment_name: file.name
        });

        if (messageError) throw messageError;
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
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
    <Tabs defaultValue="direct" className="h-[calc(100vh-4rem)] flex">
      <div className="w-64 bg-chat-sidebar flex flex-col h-full flex-shrink-0 border-r">
        <div className="p-4">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="direct" className="flex-1">
              <MessageSquare className="h-4 w-4 mr-2" />
              Direct
            </TabsTrigger>
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
            <TabsContent value="direct" className="m-0">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground px-2">Messages récents</h3>
                {chatHistory.map((chat) => (
                  <Button
                    key={chat.id}
                    variant={selectedAdmin === chat.id ? "secondary" : "ghost"}
                    className="w-full justify-start text-left"
                    onClick={() => {
                      setSelectedAdmin(chat.id);
                      setSelectedChannel(null);
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    <div className="flex flex-col items-start">
                      <span className="text-foreground">{chat.name}</span>
                      {chat.lastMessage && (
                        <span className="text-xs text-muted-foreground truncate">
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
            </TabsContent>

            <TabsContent value="groups" className="m-0">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground px-2">Canaux</h3>
                {channels.map((channel) => (
                  <Button
                    key={channel.id}
                    variant={selectedChannel === channel.id ? "secondary" : "ghost"}
                    className="w-full justify-start text-left"
                    onClick={() => {
                      setSelectedChannel(channel.id);
                      setSelectedAdmin(null);
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    <div className="flex flex-col items-start">
                      <span className="text-foreground">{channel.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {channel.members_count} membres
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        {(selectedAdmin || selectedChannel) ? (
          <>
            <div className="h-14 border-b flex items-center px-4">
              <div className="font-medium">
                {selectedAdmin ? (
                  chatHistory.find(c => c.id === selectedAdmin)?.name || 
                  admins.find(a => a.id === selectedAdmin)?.email
                ) : (
                  channels.find(c => c.id === selectedChannel)?.name
                )}
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.sender_id === currentUserId
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary'
                      }`}
                    >
                      {message.content}
                      <div className="text-xs opacity-70 mt-1">
                        {new Date(message.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Tapez votre message..."
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-gray-100"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <Paperclip className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-gray-100"
                        >
                          <Smile className="h-4 w-4 text-gray-500" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="end">
                        <EmojiPicker onEmojiClick={onEmojiClick} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={isUploading || !newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
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
