import { useState, useEffect } from "react";
import { MessagingContainer } from "./messaging/MessagingContainer";
import { ChannelList } from "./ChannelList";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const MessagesTab = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [unreadMentions, setUnreadMentions] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    console.log('Setting up mentions subscription in MessagesTab');
    fetchUnreadMentions();
    
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found for mentions subscription');
        return;
      }

      console.log('Subscribing to mentions for user:', user.id);
      const channel = supabase.channel('interpreter-mentions-messages')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'message_mentions',
            filter: `mentioned_user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Received mention update:', payload);
            fetchUnreadMentions();
          }
        )
        .subscribe((status) => {
          console.log('Mentions subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to mentions');
          }
          if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to mentions');
            toast({
              title: "Erreur de notification",
              description: "Impossible de recevoir les notifications en temps réel",
              variant: "destructive",
            });
          }
        });

      return () => {
        console.log('Cleaning up mentions subscription');
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, []);

  const fetchUnreadMentions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found for fetching mentions');
        return;
      }

      console.log('Fetching unread mentions for user:', user.id);
      const { data: mentions, error } = await supabase
        .from('message_mentions')
        .select('*')
        .eq('mentioned_user_id', user.id)
        .eq('status', 'unread');

      if (error) {
        console.error('Error fetching unread mentions:', error);
        throw error;
      }

      console.log('Unread mentions count:', mentions?.length);
      setUnreadMentions(mentions?.length || 0);
    } catch (error) {
      console.error('Error in fetchUnreadMentions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les mentions non lues",
        variant: "destructive",
      });
    }
  };

  const handleChannelSelect = async (channelId: string) => {
    setSelectedChannelId(channelId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found for updating mentions');
        return;
      }

      console.log('Marking mentions as read for channel:', channelId);
      const { error } = await supabase
        .from('message_mentions')
        .update({ status: 'read' })
        .eq('mentioned_user_id', user.id)
        .eq('channel_id', channelId)
        .eq('status', 'unread');

      if (error) {
        console.error('Error updating mention status:', error);
        throw error;
      }

      fetchUnreadMentions();
    } catch (error) {
      console.error('Error in handleChannelSelect:', error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer les mentions comme lues",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid grid-cols-[300px_1fr] gap-4 h-[calc(100vh-16rem)]">
      <div className="relative">
        <ChannelList onChannelSelect={handleChannelSelect} />
        {unreadMentions > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute top-2 right-2 z-10 min-w-[20px] h-5 flex items-center justify-center"
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