import { useState, useEffect } from "react";
import { MessagingContainer } from "./messaging/MessagingContainer";
import { ChannelList } from "@/components/shared/ChannelList";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const MessagesTab = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [unreadMentions, setUnreadMentions] = useState<number>(0);

  useEffect(() => {
    fetchUnreadMentions();
    const cleanup = subscribeToMentions();
    return () => {
      cleanup();
    };
  }, []);

  const fetchUnreadMentions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: mentions, error } = await supabase
        .from('message_mentions')
        .select('*')
        .eq('mentioned_user_id', user.id)
        .eq('status', 'unread');

      if (error) throw error;
      setUnreadMentions(mentions?.length || 0);
    } catch (error) {
      console.error('Error fetching unread mentions:', error);
    }
  };

  const subscribeToMentions = () => {
    const channel = supabase.channel('mentions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_mentions'
        },
        () => {
          fetchUnreadMentions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleChannelSelect = async (channelId: string) => {
    setSelectedChannelId(channelId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark mentions as read when entering the channel
      await supabase
        .from('message_mentions')
        .update({ status: 'read' })
        .eq('mentioned_user_id', user.id)
        .eq('channel_id', channelId);

      fetchUnreadMentions();
    } catch (error) {
      console.error('Error updating mentions:', error);
    }
  };

  return (
    <div className="grid grid-cols-[300px_1fr] gap-4 h-[calc(100vh-16rem)]">
      <div className="relative">
        <ChannelList onChannelSelect={handleChannelSelect} />
        {unreadMentions > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute top-2 right-2"
          >
            {unreadMentions}
          </Badge>
        )}
      </div>
      {selectedChannelId ? (
        <MessagingContainer channelId={selectedChannelId} />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Select a channel to start chatting
        </div>
      )}
    </div>
  );
};
