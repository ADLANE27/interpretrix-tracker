import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InterpreterSelector } from "./components/InterpreterSelector";
import { MessageList } from "./components/MessageList";
import { MessageInput } from "./components/MessageInput";
import { MessageActions } from "./components/MessageActions";
import { useMessages } from "./hooks/useMessages";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare } from "lucide-react";
import { useLocation } from "react-router-dom";

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

export const DirectMessaging = () => {
  const location = useLocation();
  const [interpreters, setInterpreters] = useState<Interpreter[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [selectedInterpreter, setSelectedInterpreter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const {
    messages,
    newMessage,
    setNewMessage,
    fetchMessages,
    sendMessage,
  } = useMessages();

  useEffect(() => {
    const state = location.state as { selectedUserId?: string };
    if (state?.selectedUserId) {
      setSelectedInterpreter(state.selectedUserId);
    }
    fetchChatHistory();
  }, [location]);

  useEffect(() => {
    if (selectedInterpreter) {
      fetchMessages(selectedInterpreter);
      const channel = subscribeToMessages(selectedInterpreter);
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedInterpreter]);

  const fetchChatHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get unique users from direct messages
      const { data: messageUsers, error: msgError } = await supabase
        .from('direct_messages')
        .select('sender_id, recipient_id')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);

      if (msgError) throw msgError;

      // Get unique interpreter IDs
      const uniqueInterpreterIds = new Set<string>();
      messageUsers?.forEach(msg => {
        const otherId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        uniqueInterpreterIds.add(otherId);
      });

      // Get interpreter profiles
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
    }
  };

  const subscribeToMessages = (interpreterId: string) => {
    console.log("Subscribing to messages for interpreter:", interpreterId);
    return supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
          filter: `or(sender_id.eq.${interpreterId},recipient_id.eq.${interpreterId})`
        },
        (payload) => {
          console.log("Received message update:", payload);
          fetchMessages(interpreterId);
          fetchChatHistory(); // Update chat history when new messages arrive
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) return;

    try {
      const { data, error } = await supabase
        .from("interpreter_profiles")
        .select("id, first_name, last_name, email")
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`);

      if (error) throw error;
      setInterpreters(data || []);
    } catch (error) {
      console.error("Error searching interpreters:", error);
      toast({
        title: "Erreur",
        description: "Impossible de rechercher les interprètes",
        variant: "destructive",
      });
    }
  };

  const handleSelectInterpreter = (interpreterId: string) => {
    setSelectedInterpreter(interpreterId);
    setSearchTerm("");
    setInterpreters([]);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Sidebar with chat history and search */}
      <div className="w-64 bg-chat-sidebar flex flex-col h-full flex-shrink-0 border-r">
        <div className="p-4">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un interprète..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <ScrollArea className="h-[calc(100vh-8rem)]">
            {/* Search Results */}
            {searchTerm && interpreters.length > 0 && (
              <div className="space-y-2 mb-4">
                <h3 className="text-sm font-medium text-gray-400 px-2">Résultats</h3>
                {interpreters.map((interpreter) => (
                  <Button
                    key={interpreter.id}
                    variant="ghost"
                    className="w-full justify-start text-left"
                    onClick={() => handleSelectInterpreter(interpreter.id)}
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
                    onClick={() => handleSelectInterpreter(chat.id)}
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
          </ScrollArea>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedInterpreter ? (
          <>
            {/* Chat Header */}
            <div className="h-14 border-b flex items-center px-4">
              <div className="font-medium">
                {chatHistory.find(c => c.id === selectedInterpreter)?.name || 
                 interpreters.find(i => i.id === selectedInterpreter)?.first_name + ' ' + 
                 interpreters.find(i => i.id === selectedInterpreter)?.last_name}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === selectedInterpreter ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.sender_id === selectedInterpreter
                          ? 'bg-gray-100'
                          : 'bg-blue-500 text-white'
                      }`}
                    >
                      <div className="break-words">{message.content}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {new Date(message.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Tapez votre message..."
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(selectedInterpreter);
                    }
                  }}
                />
                <Button 
                  onClick={() => sendMessage(selectedInterpreter)}
                  disabled={isLoading || !newMessage.trim()}
                >
                  Envoyer
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Sélectionnez un interprète pour commencer une conversation
          </div>
        )}
      </div>
    </div>
  );
};