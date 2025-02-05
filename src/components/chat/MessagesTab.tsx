import { useState, useEffect } from "react";
import { MessagingContainer } from "./messaging/MessagingContainer";
import { ChannelList } from "./ChannelList";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const MessagesTab = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [unreadMentions, setUnreadMentions] = useState(0);

  const { data: userRole } = useQuery({
    queryKey: ['userRole'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data.role;
    }
  });

  useEffect(() => {
    const fetchUnreadMentions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from('message_mentions')
        .select('*', { count: 'exact', head: true })
        .eq('mentioned_user_id', user.id)
        .eq('status', 'unread');

      if (!error && count !== null) {
        setUnreadMentions(count);
      }
    };

    fetchUnreadMentions();

    // Subscribe to mention updates
    const channel = supabase
      .channel('message-mentions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_mentions',
          filter: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            return `mentioned_user_id=eq.${user?.id}`;
          }
        },
        () => {
          fetchUnreadMentions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="grid grid-cols-[300px_1fr] gap-4 h-[calc(100vh-16rem)]">
      <ChannelList 
        onChannelSelect={setSelectedChannelId} 
        showCreateChannel={userRole === 'admin'}
      />
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold">Messages</h2>
          {unreadMentions > 0 && (
            <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center">
              {unreadMentions}
            </Badge>
          )}
        </div>
        {selectedChannelId ? (
          <MessagingContainer channelId={selectedChannelId} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Sélectionnez un canal pour commencer à discuter
          </div>
        )}
      </div>
    </div>
  );
};