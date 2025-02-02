import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Trash2 } from "lucide-react";
import { MessageInput } from "./MessageInput";
import { ThreadView } from "./ThreadView";
import { FileAttachment } from "./FileAttachment";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_name?: string;
  attachment_url?: string;
  attachment_name?: string;
}

interface ChannelMessagesProps {
  channelId: string;
}

export const ChannelMessages = ({ channelId }: ChannelMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<Message | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initializeUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };

    initializeUser();
    fetchMessages();
    
    const channel = supabase
      .channel(`messages-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  const fetchMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          sender_id,
          created_at,
          attachment_url,
          attachment_name
        `)
        .eq("channel_id", channelId)
        .is("parent_id", null)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      const { data: interpreterProfiles, error: interpreterError } = await supabase
        .from("interpreter_profiles")
        .select("id, first_name, last_name");

      if (interpreterError) throw interpreterError;

      const interpreterNames = new Map(
        interpreterProfiles?.map(p => [p.id, `${p.first_name} ${p.last_name}`])
      );

      const messagesWithDetails = messagesData?.map(message => ({
        ...message,
        sender_name: interpreterNames.get(message.sender_id) || "Unknown User"
      }));

      setMessages(messagesWithDetails || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (content: string, file?: File) => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let attachment_url = null;
      let attachment_name = null;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('message_attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('message_attachments')
          .getPublicUrl(fileName);

        attachment_url = publicUrl;
        attachment_name = file.name;
      }

      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          content,
          sender_id: user.id,
          attachment_url,
          attachment_name,
        });

      if (insertError) throw insertError;

      setNewMessage("");
      await fetchMessages();
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;

      setMessages(prev => prev.filter(msg => msg.id !== messageId));
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
    } finally {
      setMessageToDelete(null);
    }
  };

  return (
    <div className="flex-1 flex h-full">
      <div className="flex-1 flex flex-col h-full relative">
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            {messages.map((message) => {
              const isCurrentUser = message.sender_id === currentUserId;
              return (
                <div
                  key={message.id}
                  className="group hover:bg-chat-messageHover rounded-lg p-2 -mx-2"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-sm bg-chat-selected text-white flex items-center justify-center text-sm font-medium">
                      {message.sender_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {message.sender_name}
                        </span>
                        <span className="text-xs text-chat-timestamp">
                          {new Date(message.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit'
                          })}
                        </span>
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedThread(message)}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          {isCurrentUser && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setMessageToDelete(message.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="text-sm mt-1">
                        {message.content}
                        {message.attachment_url && (
                          <FileAttachment 
                            url={message.attachment_url} 
                            name={message.attachment_name || 'Attachment'} 
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-chat-divider">
          <MessageInput
            value={newMessage}
            onChange={setNewMessage}
            onSendMessage={sendMessage}
            isUploading={isLoading}
          />
        </div>
      </div>

      {selectedThread && (
        <div className="w-[400px] border-l border-chat-divider h-full">
          <ThreadView
            parentMessage={selectedThread}
            onClose={() => setSelectedThread(null)}
          />
        </div>
      )}

      <Dialog open={!!messageToDelete} onOpenChange={() => setMessageToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce message ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageToDelete(null)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => messageToDelete && deleteMessage(messageToDelete)}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
