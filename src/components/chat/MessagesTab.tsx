import { useState, useEffect } from "react";
import { MessagingContainer } from "./messaging/MessagingContainer";
import { ChannelList } from "./ChannelList";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const MessagesTab = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [unreadMentions, setUnreadMentions] = useState<number>(0);

  useEffect(() => {
    fetchUnreadMentions();
    let cleanup: (() => void) | undefined;
    
    const initSubscription = async () => {
      cleanup = await subscribeToMentions();
    };

    initSubscription();

    return () => {
      if (cleanup) cleanup();
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

  const subscribeToMentions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return () => {};

    const channel = supabase.channel('interpreter-mentions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_mentions',
          filter: `mentioned_user_id=eq.${user.id}`
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

      await supabase
        .from('message_mentions')
        .update({ status: 'read' })
        .eq('mentioned_user_id', user.id)
        .eq('channel_id', channelId)
        .eq('status', 'unread');

      fetchUnreadMentions();
    } catch (error) {
      console.error('Error updating mention status:', error);
    }
  };

  return (
    <div className="grid grid-cols-[300px_1fr] gap-4 h-[calc(100vh-16rem)]">
      <div className="relative">
        <ChannelList onChannelSelect={handleChannelSelect} />
        {unreadMentions > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute top-2 right-2 z-10"
          >
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
  );
};