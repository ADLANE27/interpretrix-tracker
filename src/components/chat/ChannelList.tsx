
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateChannelDialog } from "@/components/admin/CreateChannelDialog";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useChannels } from "@/hooks/chat/useChannels";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export const ChannelList = ({ onChannelSelect }: { onChannelSelect: (channelId: string) => void }) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Use the enhanced useChannels hook
  const { 
    channels, 
    selectedChannelId, 
    setSelectedChannelId, 
    isAdmin, 
    isLoading,
    isAuthenticated
  } = useChannels();
  
  const [unreadMentions, setUnreadMentions] = useState<{ [key: string]: number }>({});
  const { toast } = useToast();

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
    if (!isAuthenticated) return; // Skip if not authenticated
    
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
  }, [isAuthenticated]);

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
    onChannelSelect(channelId);
  };

  // Render loading state if checking authentication or loading channels
  if (isLoading || isAuthenticated === null) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Canaux de discussion</h2>
        </div>
        <div className="h-[400px] flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  // Render not authenticated state
  if (isAuthenticated === false) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Canaux de discussion</h2>
        </div>
        <div className="h-[400px] flex items-center justify-center p-4 text-center text-muted-foreground">
          <p>Veuillez vous connecter pour accéder aux canaux de discussion.</p>
        </div>
      </div>
    );
  }

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
          {channels.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Aucun canal disponible
            </div>
          ) : (
            channels.map((channel) => (
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
            ))
          )}
        </div>
      </ScrollArea>

      {isCreateDialogOpen && (
        <CreateChannelDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onChannelCreated={() => {}} // We'll use the React Query refetch instead
        />
      )}
    </div>
  );
};
