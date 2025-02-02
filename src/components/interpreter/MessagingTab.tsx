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
  isAdmin?: boolean;
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

  const handleSearch = async (term: string) => {
    if (term.length < 2) {
      setInterpreters([]);
      return;
    }

    try {
      // First, search for interpreters
      const { data: interpreterData, error: interpreterError } = await supabase
        .from("interpreter_profiles")
        .select("id, first_name, last_name, email")
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`);

      if (interpreterError) throw interpreterError;

      // Then, search for admins
      const { data: adminData, error: adminError } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          users:user_id (
            email
          )
        `)
        .eq('role', 'admin')
        .textSearch('users.email', term);

      if (adminError) throw adminError;

      // For admins found, get their details from the get-user-info function
      const adminProfiles = await Promise.all(
        adminData.map(async (admin) => {
          try {
            const { data, error } = await supabase.functions.invoke('get-user-info', {
              body: { userId: admin.user_id }
            });

            if (error) throw error;

            return {
              id: admin.user_id,
              first_name: data.first_name || 'Admin',
              last_name: data.last_name || '',
              email: admin.users.email,
              isAdmin: true
            };
          } catch (error) {
            console.error('Error fetching admin info:', error);
            return null;
          }
        })
      );

      // Combine and filter out any null results from failed admin fetches
      const validAdminProfiles = adminProfiles.filter(profile => profile !== null);
      setInterpreters([...interpreterData || [], ...validAdminProfiles]);

    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: "Erreur",
        description: "Impossible de rechercher les utilisateurs",
        variant: "destructive",
      });
    }
  };

  const fetchDirectMessages = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setDirectMessages(data || []);

      // Update chat history to include admin status
      const isAdmin = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      if (isAdmin.data) {
        const { data: userInfo } = await supabase.functions.invoke('get-user-info', {
          body: { userId }
        });

        const updatedHistory = chatHistory.map(chat => 
          chat.id === userId 
            ? { ...chat, isAdmin: true, name: `${userInfo.first_name} ${userInfo.last_name} (Admin)` }
            : chat
        );
        setChatHistory(updatedHistory);
      }

    } catch (error) {
      console.error("Error fetching direct messages:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les messages",
        variant: "destructive",
      });
    }
  };

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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  handleSearch(e.target.value);
                }}
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
                {searchTerm && interpreters.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <h3 className="text-sm font-medium text-gray-400 px-2">Résultats</h3>
                    {interpreters.map((user) => (
                      <Button
                        key={user.id}
                        variant="ghost"
                        className="w-full justify-start text-left"
                        onClick={() => {
                          setSelectedInterpreter(user.id);
                          setSelectedChannel(null);
                          setSearchTerm("");
                          setInterpreters([]);
                          const newChat = {
                            id: user.id,
                            name: `${user.first_name} ${user.last_name}${user.isAdmin ? ' (Admin)' : ''}`,
                            unreadCount: 0,
                            isAdmin: user.isAdmin
                          };
                          if (!chatHistory.some(chat => chat.id === user.id)) {
                            setChatHistory(prev => [...prev, newChat]);
                          }
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        <div className="flex flex-col items-start">
                          <span>{user.first_name} {user.last_name}{user.isAdmin ? ' (Admin)' : ''}</span>
                          <span className="text-xs text-gray-500">{user.email}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}

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
