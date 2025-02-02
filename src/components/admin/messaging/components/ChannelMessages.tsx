import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare } from "lucide-react";
import { MessageInput } from "./MessageInput";
import { ThreadView } from "./ThreadView";
import { FileAttachment } from "./FileAttachment";

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

      // Fetch main messages (no parent_id)
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

      // Get interpreter profiles
      const { data: interpreterProfiles, error: interpreterError } = await supabase
        .from("interpreter_profiles")
        .select("id, first_name, last_name");

      if (interpreterError) throw interpreterError;

      // Create a map of interpreter names
      const interpreterNames = new Map(
        interpreterProfiles?.map(p => [p.id, `${p.first_name} ${p.last_name}`])
      );

      // Combine messages with sender names
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

  const sendMessage = async (attachmentUrl?: string, attachmentName?: string) => {
    if (!newMessage.trim() && !attachmentUrl) return;

    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("messages")
        .insert({
          channel_id: channelId,
          content: newMessage.trim(),
          sender_id: user.id,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
        });

      if (error) throw error;
      setNewMessage("");
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setSelectedThread(message)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
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
            <div className="text-xs text-center text-gray-500 py-4">
              © {new Date().getFullYear()} AFTraduction. Tous droits réservés.
            </div>
          </div>
        </ScrollArea>

        <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-chat-divider">
          <MessageInput
            value={newMessage}
            onChange={setNewMessage}
            onSend={sendMessage}
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
    </div>
  );
};