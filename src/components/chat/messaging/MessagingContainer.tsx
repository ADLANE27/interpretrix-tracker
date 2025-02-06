import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageList } from "./MessageList";
import { ChatInput } from "../ChatInput";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { ChannelMembersDialog } from "../ChannelMembersDialog";
import { Message, Attachment, isAttachment } from "@/types/messaging";

interface MessagingContainerProps {
  channelId: string;
}

export const MessagingContainer = ({ channelId }: MessagingContainerProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formattedMessages: Message[] = await Promise.all((data || []).map(async (msg) => {
        const { data: senderData } = await supabase
          .rpc('get_message_sender_details', {
            sender_id: msg.sender_id
          });

        const sender = senderData?.[0] || { id: msg.sender_id, name: 'Unknown', avatar_url: '' };

        const parsedAttachments: Attachment[] = [];
        if (Array.isArray(msg.attachments)) {
          msg.attachments.forEach(att => {
            if (typeof att === 'object' && att !== null) {
              const attachment = {
                url: String(att.url || ''),
                filename: String(att.filename || ''),
                type: String(att.type || ''),
                size: Number(att.size || 0)
              };
              if (isAttachment(attachment)) {
                parsedAttachments.push(attachment);
              }
            }
          });
        }

        let parsedReactions = {};
        try {
          if (typeof msg.reactions === 'string') {
            parsedReactions = JSON.parse(msg.reactions);
          } else if (msg.reactions && typeof msg.reactions === 'object') {
            parsedReactions = msg.reactions;
          }
        } catch (e) {
          console.error('[Chat] Error parsing reactions:', e);
        }

        return {
          id: msg.id,
          content: msg.content,
          sender: {
            id: sender.id,
            name: sender.name,
            avatarUrl: sender.avatar_url || ''
          },
          timestamp: new Date(msg.created_at),
          reactions: parsedReactions,
          attachments: parsedAttachments
        };
      }));

      setMessages(formattedMessages);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchMessages();
    
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          console.log("Message change received:", payload);
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (content: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          content,
          channel_id: channelId,
          sender_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchMessages();
      return data.id;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold">Messages</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMembersDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          Members
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <MessageList 
          messages={messages} 
          isLoading={isLoading}
          currentUserId={(supabase.auth.getUser()).data.user?.id || null}
          onDeleteMessage={async (messageId) => {
            try {
              await supabase
                .from('chat_messages')
                .delete()
                .eq('id', messageId);
              await fetchMessages();
            } catch (error) {
              console.error("Error deleting message:", error);
            }
          }}
          onReactToMessage={async (messageId, emoji) => {
            try {
              const { data: message } = await supabase
                .from('chat_messages')
                .select('reactions')
                .eq('id', messageId)
                .single();

              if (!message) return;

              const currentUserId = (await supabase.auth.getUser()).data.user?.id;
              if (!currentUserId) return;

              const reactions = message.reactions || {};
              const users = reactions[emoji] || [];
              
              const updatedUsers = users.includes(currentUserId)
                ? users.filter(id => id !== currentUserId)
                : [...users, currentUserId];

              await supabase
                .from('chat_messages')
                .update({
                  reactions: {
                    ...reactions,
                    [emoji]: updatedUsers
                  }
                })
                .eq('id', messageId);

              await fetchMessages();
            } catch (error) {
              console.error("Error updating reaction:", error);
            }
          }}
        />
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t">
        <ChatInput 
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          channelId={channelId}
          currentUserId={(supabase.auth.getUser()).data.user?.id || null}
        />
      </div>

      <ChannelMembersDialog
        channelId={channelId}
        isOpen={isMembersDialogOpen}
        onClose={() => setIsMembersDialogOpen(false)}
      />
    </div>
  );
};