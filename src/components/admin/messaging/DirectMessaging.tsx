import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageList } from "./components/MessageList";
import { MessageInput } from "./components/MessageInput";
import { MessageActions } from "./components/MessageActions";
import { useMessages } from "./hooks/useMessages";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoreVertical, Search, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface ChatHistory {
  userId: string;
  email: string;
  first_name?: string;
  last_name?: string;
  lastMessage?: string;
  lastMessageDate?: string;
  unreadCount: number;
}

interface MessageWithUsers {
  id: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
  sender: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  recipient: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  read_at: string | null;
}

export const DirectMessaging = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  
  const {
    messages,
    editingMessage,
    editContent,
    setEditingMessage,
    setEditContent,
    fetchMessages,
    sendMessage,
    updateMessage,
    deleteMessage,
    deleteAllMessages,
  } = useMessages();

  useEffect(() => {
    fetchChatHistory();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id);
      const channel = subscribeToMessages(selectedUser.id);
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedUser]);

  const fetchChatHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: messages, error } = await supabase
        .from("direct_messages")
        .select(`
          id,
          content,
          created_at,
          sender_id,
          recipient_id,
          read_at,
          sender:interpreter_profiles!direct_messages_sender_id_fkey(
            id,
            email,
            first_name,
            last_name
          ),
          recipient:interpreter_profiles!direct_messages_recipient_id_fkey(
            id,
            email,
            first_name,
            last_name
          )
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const history = new Map<string, ChatHistory>();

      messages?.forEach((message: MessageWithUsers) => {
        const otherUser = message.sender_id === user.id ? message.recipient : message.sender;
        if (!otherUser) return;

        if (!history.has(otherUser.id)) {
          history.set(otherUser.id, {
            userId: otherUser.id,
            email: otherUser.email,
            first_name: otherUser.first_name,
            last_name: otherUser.last_name,
            lastMessage: message.content,
            lastMessageDate: message.created_at,
            unreadCount: message.recipient_id === user.id && !message.read_at ? 1 : 0
          });
        } else if (!message.read_at && message.recipient_id === user.id) {
          const existing = history.get(otherUser.id)!;
          existing.unreadCount += 1;
        }
      });

      setChatHistory(Array.from(history.values()));
    } catch (error) {
      console.error("Error fetching chat history:", error);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    try {
      setIsSearching(true);
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const userIds = userRoles.map(role => role.user_id);
      
      const { data: profiles, error: profilesError } = await supabase
        .from("interpreter_profiles")
        .select("id, email, first_name, last_name")
        .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .in('id', userIds);

      if (profilesError) throw profilesError;
      
      setUsers(profiles || []);
    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: "Erreur",
        description: "Impossible de rechercher les utilisateurs",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const subscribeToMessages = (userId: string) => {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
        },
        () => {
          fetchMessages(userId);
          fetchChatHistory();
        }
      )
      .subscribe();

    return channel;
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Sidebar */}
      <div className="w-80 bg-chat-sidebar border-r flex flex-col h-full">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un utilisateur..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              className="pl-8"
            />
          </div>
          
          {searchQuery && (
            <Card className="mt-2 p-2">
              <ScrollArea className="max-h-48">
                {users.map((user) => (
                  <Button
                    key={user.id}
                    variant="ghost"
                    className="w-full justify-start text-sm"
                    onClick={() => {
                      setSelectedUser(user);
                      setSearchQuery("");
                      setUsers([]);
                    }}
                  >
                    {user.first_name} {user.last_name}
                    <span className="text-xs text-muted-foreground ml-2">
                      ({user.email})
                    </span>
                  </Button>
                ))}
                {users.length === 0 && !isSearching && (
                  <p className="text-sm text-muted-foreground p-2">
                    Aucun utilisateur trouvé
                  </p>
                )}
              </ScrollArea>
            </Card>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {chatHistory.map((chat) => (
              <Button
                key={chat.userId}
                variant="ghost"
                className={`w-full justify-start relative px-3 py-2 text-sm ${
                  selectedUser?.id === chat.userId
                    ? "bg-chat-selected text-white hover:bg-chat-selected"
                    : "hover:bg-chat-hover"
                }`}
                onClick={() => setSelectedUser({
                  id: chat.userId,
                  email: chat.email,
                  first_name: chat.first_name,
                  last_name: chat.last_name,
                })}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">
                    {chat.first_name} {chat.last_name}
                  </span>
                  {chat.lastMessage && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {chat.lastMessage}
                    </span>
                  )}
                </div>
                {chat.unreadCount > 0 && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                    {chat.unreadCount}
                  </div>
                )}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white h-full">
        {selectedUser ? (
          <>
            <div className="h-14 border-b border-chat-channelBorder flex items-center justify-between px-4 bg-chat-channelHeader">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">
                  {selectedUser.first_name} {selectedUser.last_name}
                </span>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>

            <div className="flex-1 flex flex-col">
              <MessageActions
                searchTerm=""
                onSearchChange={() => {}}
                onDeleteAll={() => deleteAllMessages(selectedUser.id)}
                isDeleteDialogOpen={false}
                setIsDeleteDialogOpen={() => {}}
              />

              <ScrollArea className="flex-1 px-4">
                <MessageList
                  messages={messages}
                  selectedUser={selectedUser}
                  editingMessage={editingMessage}
                  editContent={editContent}
                  onEditStart={(messageId, content) => {
                    setEditingMessage(messageId);
                    setEditContent(content);
                  }}
                  onEditCancel={() => {
                    setEditingMessage(null);
                    setEditContent("");
                  }}
                  onEditSave={(messageId) => updateMessage(messageId, editContent)}
                  onEditChange={setEditContent}
                  onDeleteMessage={deleteMessage}
                />
              </ScrollArea>

              <div className="p-4 border-t">
                <MessageInput
                  value=""
                  onChange={() => {}}
                  onSend={(content) => sendMessage(content, selectedUser.id)}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Sélectionnez une conversation ou recherchez un utilisateur pour commencer à discuter
          </div>
        )}
      </div>
    </div>
  );
};