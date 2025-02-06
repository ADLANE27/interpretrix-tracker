import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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

  // Fetch channels the interpreter has access to
  const fetchChannels = async () => {
    try {
      console.log('[InterpreterChat] Fetching channels...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: channels, error } = await supabase
        .from("chat_channels")
        .select("*")
        .order("name");

      if (error) throw error;
      console.log('[InterpreterChat] Channels fetched:', channels);
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

  // Fetch unread mentions for each channel
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
        () => fetchUnreadMentions()
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Canaux de discussion</h2>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-2">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className={`
                flex items-center justify-between p-2 rounded-lg 
                cursor-pointer transition-colors
                ${selectedChannelId === channel.id ? 'bg-interpreter-navy text-white' : 'hover:bg-accent/50'}
              `}
              onClick={() => handleChannelSelect(channel.id)}
            >
              <div className="flex items-center gap-2 flex-1">
                <span className="font-medium">{channel.name}</span>
                {unreadMentions[channel.id] > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadMentions[channel.id]}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};