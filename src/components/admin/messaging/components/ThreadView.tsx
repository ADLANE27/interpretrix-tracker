import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface ThreadViewProps {
  parentMessage: {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    sender_name?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | null;
}

interface ThreadMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_name?: string;
}

export const ThreadView = ({ parentMessage, isOpen, onClose, currentUserId }: ThreadViewProps) => {
  const [replies, setReplies] = useState<ThreadMessage[]>([]);
  const [newReply, setNewReply] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (parentMessage?.id) {
      fetchReplies();
      subscribeToReplies();
    }
  }, [parentMessage?.id]);

  const fetchReplies = async () => {
    if (!parentMessage?.id) return;

    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          sender_id,
          created_at
        `)
        .eq("parent_id", parentMessage.id)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      // Get all unique sender IDs
      const senderIds = [...new Set(messagesData?.map(m => m.sender_id) || [])];

      // Get interpreter profiles
      const { data: interpreterProfiles, error: interpreterError } = await supabase
        .from("interpreter_profiles")
        .select("id, first_name, last_name")
        .in("id", senderIds);

      if (interpreterError) throw interpreterError;

      // Get user roles to identify admins
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", senderIds)
        .eq("role", "admin");

      if (rolesError) throw rolesError;

      // Create maps for names
      const interpreterNames = new Map(
        interpreterProfiles?.map(p => [p.id, `${p.first_name} ${p.last_name}`])
      );

      const adminNames = new Map();
      const adminIds = userRoles?.map(r => r.user_id) || [];

      if (adminIds.length > 0) {
        for (const adminId of adminIds) {
          const response = await supabase.functions.invoke('get-user-info', {
            body: { userId: adminId }
          });
          
          if (!response.error && response.data) {
            adminNames.set(
              adminId, 
              `${response.data.first_name || ''} ${response.data.last_name || ''}`
            );
          }
        }
      }

      // Combine messages with sender names
      const messagesWithNames = messagesData?.map(message => ({
        ...message,
        sender_name: interpreterNames.get(message.sender_id) || 
                    adminNames.get(message.sender_id) ||
                    "Unknown User"
      }));

      setReplies(messagesWithNames || []);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Error fetching replies:", error);
      toast({
        title: "Error",
        description: "Failed to load replies",
        variant: "destructive",
      });
    }
  };

  const subscribeToReplies = () => {
    const channel = supabase
      .channel(`thread-${parentMessage?.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `parent_id=eq.${parentMessage?.id}`,
        },
        () => {
          fetchReplies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const sendReply = async () => {
    if (!newReply.trim() || !parentMessage?.id) return;

    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("messages")
        .insert({
          content: newReply.trim(),
          parent_id: parentMessage.id,
          channel_id: null,
          sender_id: user.id,
        });

      if (error) throw error;
      setNewReply("");
    } catch (error) {
      console.error("Error sending reply:", error);
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={() => onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] p-0">
        <SheetHeader className="p-4 border-b">
          <div className="flex justify-between items-center">
            <SheetTitle>Thread</SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {parentMessage && (
            <div className="mt-4 p-3 bg-secondary rounded-lg">
              <div className="text-sm font-medium">{parentMessage.sender_name}</div>
              <div className="mt-1">{parentMessage.content}</div>
              <div className="text-xs text-gray-500 mt-2">
                {new Date(parentMessage.created_at).toLocaleString()}
              </div>
            </div>
          )}
        </SheetHeader>

        <div className="flex flex-col h-[calc(100vh-200px)]">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {replies.map((reply) => {
                const isCurrentUser = reply.sender_id === currentUserId;
                return (
                  <div
                    key={reply.id}
                    className={`flex flex-col space-y-1 ${
                      isCurrentUser ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="text-sm font-medium">
                      {reply.sender_name}
                    </div>
                    <div 
                      className={`p-3 rounded-lg max-w-[80%] ${
                        isCurrentUser 
                          ? 'bg-interpreter-navy text-white' 
                          : 'bg-secondary'
                      }`}
                    >
                      {reply.content}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(reply.created_at).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                placeholder="Reply to thread..."
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendReply();
                  }
                }}
              />
              <Button onClick={sendReply} disabled={isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};