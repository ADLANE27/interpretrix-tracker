import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Search, Edit2, Trash2, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
  read_at: string | null;
}

interface Interpreter {
  id: string;
  first_name: string;
  last_name: string;
}

interface UnreadCount {
  [interpreterId: string]: number;
}

export const AdminMessaging = () => {
  const [interpreters, setInterpreters] = useState<Interpreter[]>([]);
  const [selectedInterpreter, setSelectedInterpreter] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchInterpreters();
    subscribeToNewMessages();
  }, []);

  useEffect(() => {
    if (selectedInterpreter) {
      fetchMessages(selectedInterpreter);
      const channel = subscribeToMessages(selectedInterpreter);
      markMessagesAsRead(selectedInterpreter);
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedInterpreter]);

  const subscribeToNewMessages = () => {
    const channel = supabase
      .channel('new-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        async (payload) => {
          const message = payload.new as Message;
          const { data: { user } } = await supabase.auth.getUser();
          
          if (message.recipient_id === user?.id) {
            const sender = interpreters.find(i => i.id === message.sender_id);
            if (sender) {
              toast({
                title: `New message from ${sender.first_name} ${sender.last_name}`,
                description: message.content,
              });
              
              setUnreadCounts(prev => ({
                ...prev,
                [message.sender_id]: (prev[message.sender_id] || 0) + 1
              }));
            }
          }
        }
      )
      .subscribe();

    return channel;
  };

  const fetchUnreadCounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('recipient_id', user.id)
        .is('read_at', null);

      if (error) throw error;

      const counts: UnreadCount = {};
      data.forEach(message => {
        counts[message.sender_id] = (counts[message.sender_id] || 0) + 1;
      });
      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  const fetchInterpreters = async () => {
    try {
      const { data, error } = await supabase
        .from("interpreter_profiles")
        .select("id, first_name, last_name");

      if (error) throw error;
      setInterpreters(data || []);
    } catch (error) {
      console.error("Error fetching interpreters:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des interprètes",
        variant: "destructive",
      });
    }
  };

  const fetchMessages = async (interpreterId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${interpreterId}),and(sender_id.eq.${interpreterId},recipient_id.eq.${user.id})`)
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

  const markMessagesAsRead = async (senderId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('mark_messages_as_read', {
        p_recipient_id: user.id,
        p_sender_id: senderId
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const subscribeToMessages = (interpreterId: string) => {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMessages((prev) => [...prev, payload.new as Message]);
            if (payload.new.recipient_id === interpreterId) {
              markMessagesAsRead(payload.new.sender_id);
            }
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id ? (payload.new as Message) : msg
              )
            );
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) =>
              prev.filter((msg) => msg.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return channel;
  };

  const sendMessage = async () => {
    if (!selectedInterpreter || !newMessage.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from("direct_messages").insert({
        content: newMessage.trim(),
        recipient_id: selectedInterpreter,
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

  const updateMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("direct_messages")
        .update({ content: editContent })
        .eq("id", messageId);

      if (error) throw error;
      setEditingMessage(null);
      setEditContent("");
      toast({
        title: "Succès",
        description: "Message modifié avec succès",
      });
    } catch (error) {
      console.error("Error updating message:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le message",
        variant: "destructive",
      });
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("direct_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      setIsDeleteDialogOpen(false); // Close the dialog after successful deletion
      toast({
        title: "Succès",
        description: "Message supprimé avec succès",
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

  const deleteAllMessages = async (interpreterId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Delete all messages between the admin and interpreter (both directions)
      const { error } = await supabase
        .from("direct_messages")
        .delete()
        .or(`sender_id.eq.${interpreterId},recipient_id.eq.${interpreterId}`);

      if (error) throw error;

      setMessages([]);
      setIsDeleteAllDialogOpen(false);
      toast({
        title: "Succès",
        description: "Historique des messages supprimé",
      });
    } catch (error) {
      console.error("Error deleting all messages:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'historique des messages",
        variant: "destructive",
      });
    }
  };

  const filteredMessages = messages.filter((message) =>
    message.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {interpreters.map((interpreter) => (
          <Button
            key={interpreter.id}
            variant={selectedInterpreter === interpreter.id ? "default" : "outline"}
            onClick={() => setSelectedInterpreter(interpreter.id)}
            className="relative"
          >
            {interpreter.first_name} {interpreter.last_name}
            {unreadCounts[interpreter.id] > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 rounded-full"
              >
                {unreadCounts[interpreter.id]}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {selectedInterpreter && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher dans les messages..."
                className="flex-1"
              />
            </div>
            <Dialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer l'historique
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmer la suppression</DialogTitle>
                  <DialogDescription>
                    Êtes-vous sûr de vouloir supprimer tout l'historique des messages avec cet interprète ? Cette action est irréversible.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeleteAllDialogOpen(false)}>Annuler</Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => deleteAllMessages(selectedInterpreter)}
                  >
                    Supprimer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <ScrollArea className="h-[400px] w-full pr-4">
            <div className="space-y-4">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg max-w-[80%] ${
                    message.sender_id === selectedInterpreter
                      ? "bg-secondary ml-auto"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {editingMessage === message.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="bg-white"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateMessage(message.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingMessage(null);
                            setEditContent("");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">{message.content}</div>
                        {message.sender_id !== selectedInterpreter && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingMessage(message.id);
                                setEditContent(message.content);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Confirmer la suppression</DialogTitle>
                                  <DialogDescription>
                                    Êtes-vous sûr de vouloir supprimer ce message ?
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Annuler</Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => deleteMessage(message.id)}
                                  >
                                    Supprimer
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>
                      <div className="text-xs opacity-70 mt-1 flex items-center gap-2">
                        {new Date(message.created_at).toLocaleString()}
                        {message.read_at && message.sender_id !== selectedInterpreter && (
                          <span className="text-green-500">Lu</span>
                        )}
                      </div>
                    </>
                  )}
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
  );
};