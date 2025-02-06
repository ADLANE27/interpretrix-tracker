import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateChannelDialog } from "@/components/admin/CreateChannelDialog";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

interface Channel {
  id: string;
  name: string;
  description: string | null;
}

export const ChannelList = ({ onChannelSelect }: { onChannelSelect: (channelId: string) => void }) => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [unreadMentions, setUnreadMentions] = useState<{ [key: string]: number }>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  // Check if user is admin
  const { data: isAdmin } = useQuery({
    queryKey: ['isUserAdmin'],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
      
      return roles?.some(r => r.role === 'admin') ?? false;
    }
  });

  // Fetch channels the user has access to
  const { data: channels = [], refetch: fetchChannels } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const { data: userChannels, error } = await supabase
        .from('chat_channels')
        .select('*')
        .order('name');

      if (error) throw error;
      return userChannels;
    }
  });

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

      if (error) {
        console.error('Error fetching unread mentions:', error);
        return;
      }

      // Count mentions per channel
      const counts = data.reduce((acc: { [key: string]: number }, mention) => {
        acc[mention.channel_id] = (acc[mention.channel_id] || 0) + 1;
        return acc;
      }, {});

      setUnreadMentions(counts);
    } catch (error) {
      console.error('Error in fetchUnreadMentions:', error);
    }
  };

  // Set up real-time subscription for mentions
  useEffect(() => {
    fetchUnreadMentions();

    const channel = supabase.channel('mentions')
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

  const handleChannelSelect = async (channelId: string) => {
    setSelectedChannelId(channelId);
    onChannelSelect(channelId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark mentions as read
      await supabase
        .from('message_mentions')
        .update({ status: 'read' })
        .eq('mentioned_user_id', user.id)
        .eq('channel_id', channelId);

      // Update local state
      setUnreadMentions(prev => {
        const updated = { ...prev };
        delete updated[channelId];
        return updated;
      });
    } catch (error) {
      console.error('Error marking mentions as read:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Canaux de discussion</h2>
        {isAdmin && (
          <Button onClick={() => setIsCreateDialogOpen(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau canal
          </Button>
        )}
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

      {isCreateDialogOpen && (
        <CreateChannelDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onChannelCreated={fetchChannels}
        />
      )}
    </div>
  );
};