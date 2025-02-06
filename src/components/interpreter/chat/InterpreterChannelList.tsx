import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Bell } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  description: string | null;
}

export const InterpreterChannelList = ({ 
  onChannelSelect 
}: { 
  onChannelSelect: (channelId: string) => void 
}) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [unreadMentions, setUnreadMentions] = useState<{ [key: string]: number }>({});
  const { toast } = useToast();

  const fetchChannels = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: memberChannels, error: memberError } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      if (!memberChannels?.length) {
        setChannels([]);
        return;
      }

      const channelIds = memberChannels.map(mc => mc.channel_id);
      const { data: channels, error: channelsError } = await supabase
        .from('chat_channels')
        .select('*')
        .in('id', channelIds)
        .order('name');

      if (channelsError) throw channelsError;
      setChannels(channels || []);
    } catch (error) {
      console.error("[InterpreterChat] Error fetching channels:", error);
      toast({
        title: "Error",
        description: "Failed to fetch channels",
        variant: "destructive",
      });
    }
  };

  const fetchUnreadMentions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('message_mentions')
        .select('channel_id')
        .eq('mentioned_user_id', user.id)
        .eq('status', 'unread');

      if (error) throw error;

      const counts = data.reduce((acc: { [key: string]: number }, mention) => {
        acc[mention.channel_id] = (acc[mention.channel_id] || 0) + 1;
        return acc;
      }, {});

      setUnreadMentions(counts);
    } catch (error) {
      console.error('[InterpreterChat] Error fetching unread mentions:', error);
    }
  };

  useEffect(() => {
    fetchChannels();
    fetchUnreadMentions();

    // Set up realtime subscription for mentions
    const channel = supabase.channel('interpreter-mentions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_mentions' },
        async (payload) => {
          console.log('[InterpreterChat] Mention update:', payload);
          
          // Show toast notification for new mentions
          if (payload.eventType === 'INSERT') {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && payload.new.mentioned_user_id === user.id) {
              toast({
                title: "New Mention",
                description: (
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <span>You were mentioned in a message</span>
                  </div>
                )
              });
            }
          }
          
          fetchUnreadMentions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
    onChannelSelect(channelId);
  };

  return (
    <ScrollArea className="h-[calc(100vh-400px)]">
      <div className="space-y-2 pr-4">
        {channels.length === 0 ? (
          <div className="text-center text-muted-foreground p-4">
            You are not a member of any chat channels
          </div>
        ) : (
          channels.map((channel) => (
            <div
              key={channel.id}
              className={`
                flex items-center gap-3 p-3 rounded-lg 
                cursor-pointer transition-all duration-200
                hover:bg-accent/50 group
                ${selectedChannelId === channel.id ? 'bg-interpreter-navy text-white shadow-sm' : 'hover:shadow-sm'}
              `}
              onClick={() => handleChannelSelect(channel.id)}
            >
              <MessageCircle className={`h-5 w-5 ${selectedChannelId === channel.id ? 'text-white' : 'text-interpreter-navy group-hover:text-interpreter-navy/70'}`} />
              <div className="flex items-center justify-between flex-1 min-w-0">
                <span className="font-medium truncate">{channel.name}</span>
                {unreadMentions[channel.id] > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="ml-2 animate-pulse"
                  >
                    <Bell className="h-3 w-3 mr-1" />
                    {unreadMentions[channel.id]}
                  </Badge>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
};
