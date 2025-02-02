import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Users } from "lucide-react";
import { MessageList } from "./messages/MessageList";
import { MessageInput } from "./messages/MessageInput";
import { ChannelList } from "./messages/ChannelList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchSection } from "./messages/SearchSection";
import { useUnreadMentions } from "./messages/hooks/useUnreadMentions";
import { useChannels } from "./messages/hooks/useChannels";
import { useChatHistory } from "./messages/hooks/useChatHistory";
import { Message, Interpreter, Channel, ChatHistory } from "./messages/types";

interface MessagingTabProps {
  onMentionsRead?: () => void;
}

export const MessagingTab = ({ onMentionsRead }: MessagingTabProps) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [senderProfiles, setSenderProfiles] = useState<Record<string, { first_name: string; last_name: string; id: string; }>>({});
  const [interpreters, setInterpreters] = useState<Interpreter[]>([]);
  const [selectedInterpreter, setSelectedInterpreter] = useState<string | null>(null);
  const [directMessages, setDirectMessages] = useState<Message[]>([]);
  const { toast } = useToast();

  // Custom hooks
  const { channels } = useChannels();
  const { chatHistory, setChatHistory } = useChatHistory(currentUserId);
  const { unreadMentions } = useUnreadMentions(currentUserId);

  const handleSearch = async (term: string) => {
    if (term.length < 2) {
      setInterpreters([]);
      return;
    }

    try {
      // Search for admins
      const { data: adminRoles, error: adminError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminError) throw adminError;

      const adminIds = adminRoles?.map(role => role.user_id) || [];

      // Get admin details
      const adminProfiles: Interpreter[] = [];
      for (const adminId of adminIds) {
        const { data: adminInfo } = await supabase.functions.invoke('get-user-info', {
          body: { userId: adminId }
        });

        if (adminInfo && (
          adminInfo.first_name.toLowerCase().includes(term.toLowerCase()) ||
          adminInfo.last_name.toLowerCase().includes(term.toLowerCase())
        )) {
          adminProfiles.push({
            id: adminId,
            first_name: adminInfo.first_name,
            last_name: adminInfo.last_name,
            email: adminInfo.email || '',
            isAdmin: true
          });
        }
      }

      setInterpreters(adminProfiles);

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

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from(selectedChannel ? 'messages' : 'direct_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      if (selectedChannel) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      } else {
        setDirectMessages(prev => prev.filter(msg => msg.id !== messageId));
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le message",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (content: string, attachmentUrl?: string, attachmentName?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            channel_id: selectedChannel,
            content,
            sender_id: user.id,
            attachment_url: attachmentUrl,
            attachment_name: attachmentName
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      // No need to manually update messages array as realtime subscription will handle it
      console.log('Message sent successfully:', data);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    }
  };

  const sendDirectMessage = async (content: string, attachmentUrl?: string, attachmentName?: string) => {
    if (!selectedInterpreter || !currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert([
          {
            sender_id: currentUserId,
            recipient_id: selectedInterpreter,
            content,
            attachment_url: attachmentUrl,
            attachment_name: attachmentName
          }
        ])
        .select()
        .single();

      if (error) throw error;
      setDirectMessages(prev => [...prev, data]);
    } catch (error) {
      console.error("Error sending direct message:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (file: File): Promise<{ url: string; name: string } | null> => {
    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('message_attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('message_attachments')
        .getPublicUrl(filePath);

      return { url: data.publicUrl, name: file.name };
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le fichier",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    const initializeUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('[MessagingTab] Current user:', user.id);
        setCurrentUserId(user.id);
      }
    };

    initializeUser();
  }, []);

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
              {unreadMentions > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-2 absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center p-0 rounded-full"
                >
                  {unreadMentions}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <SearchSection
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            interpreters={interpreters}
            onSelectInterpreter={(interpreter) => {
              setSelectedInterpreter(interpreter.id);
              setSelectedChannel(null);
              setSearchTerm("");
              setInterpreters([]);
              const newChat = {
                id: interpreter.id,
                name: `${interpreter.first_name} ${interpreter.last_name}${interpreter.isAdmin ? ' (Admin)' : ''}`,
                unreadCount: 0,
                isAdmin: interpreter.isAdmin
              };
              if (!chatHistory.some(chat => chat.id === interpreter.id)) {
                setChatHistory(prev => [...prev, newChat]);
              }
              fetchDirectMessages(interpreter.id);
            }}
          />
          
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
                          fetchDirectMessages(chat.id);
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
