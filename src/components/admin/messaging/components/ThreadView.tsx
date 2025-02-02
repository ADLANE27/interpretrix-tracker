import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, X } from "lucide-react";

interface ThreadViewProps {
  parentMessage: {
    id: string;
    content: string;
    sender_name: string;
    created_at: string;
  };
  onClose: () => void;
}

interface ThreadMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_name?: string;
}

export const ThreadView = ({ parentMessage, onClose }: ThreadViewProps) => {
  const [replies, setReplies] = useState<ThreadMessage[]>([]);
  const [newReply, setNewReply] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchReplies();
    
    const channel = supabase
      .channel(`thread-${parentMessage.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `parent_id=eq.${parentMessage.id}`,
        },
        () => {
          fetchReplies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parentMessage.id]);

  const fetchReplies = async () => {
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

      // Create a map of interpreter names
      const interpreterNames = new Map(
        interpreterProfiles?.map(p => [p.id, `${p.first_name} ${p.last_name}`])
      );

      // For admin users, get their info from Edge Function
      const adminIds = userRoles?.map(r => r.user_id) || [];
      const adminNames = new Map();

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
    } catch (error) {
      console.error("Error fetching replies:", error);
      toast({
        title: "Error",
        description: "Failed to load replies",
        variant: "destructive",
      });
    }
  };

  const sendReply = async () => {
    if (!newReply.trim()) return;

    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("messages")
        .insert({
          channel_id: null,
          parent_id: parentMessage.id,
          content: newReply.trim(),
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
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="text-lg font-semibold">Thread</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 border-b bg-secondary/20">
        <div className="text-sm font-medium">{parentMessage.sender_name}</div>
        <div className="mt-1">{parentMessage.content}</div>
        <div className="text-xs text-gray-500 mt-1">
          {new Date(parentMessage.created_at).toLocaleString()}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {replies.map((reply) => (
            <div key={reply.id} className="space-y-1">
              <div className="text-sm font-medium">{reply.sender_name}</div>
              <div className="p-3 rounded-lg bg-secondary max-w-[80%]">
                {reply.content}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(reply.created_at).toLocaleString()}
              </div>
            </div>
          ))}
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
  );
};