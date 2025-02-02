import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateChannelDialog } from "./components/CreateChannelDialog";
import { ChannelMessages } from "./components/ChannelMessages";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { usePresence } from "@/hooks/usePresence";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  members_count: number;
}

export const TeamChat = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    fetchChannels();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('channel-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channels'
        },
        () => {
          console.log('Channel change detected, refreshing channels...');
          fetchChannels();
        }
      )
      .subscribe((status) => {
        console.log('Channel subscription status:', status);
      });

    return () => {
      console.log('Cleaning up channel subscription...');
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchChannels = async () => {
    try {
      console.log('Fetching channels...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return;
      }

      // First get channels where user is a member
      const { data: memberChannels, error: memberError } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', user.id);

      if (memberError) {
        console.error('Error fetching channel memberships:', memberError);
        throw memberError;
      }

      const channelIds = memberChannels?.map(m => m.channel_id) || [];
      console.log('Found channel IDs:', channelIds);

      // Then fetch the actual channels
      const { data: channels, error } = await supabase
        .from('channels')
        .select('*')
        .in('id', channelIds);

      if (error) {
        console.error('Error fetching channels:', error);
        throw error;
      }

      console.log('Successfully fetched channels:', channels);
      setChannels(channels || []);
    } catch (error) {
      console.error('Error in fetchChannels:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les canaux",
        variant: "destructive",
      });
    }
  };

  const handleCreateChannelSuccess = () => {
    setIsCreateChannelOpen(false);
    fetchChannels();
    toast({
      title: "Succès",
      description: "Canal créé avec succès",
    });
  };

  const presenceState = usePresence(currentUser?.id || '', 'team-chat');
  
  useRealtimeSubscription({
    channel: 'team-chat',
    event: '*',
    table: 'channels',
    onEvent: () => {
      console.log('[TeamChat] Channel update detected, refreshing...');
      fetchChannels();
    },
  });

  return (
    <div className="space-y-4">
      {/* Add online users indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>{Object.keys(presenceState).length} utilisateurs en ligne</span>
      </div>
      
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Chat d'équipe</h2>
        <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
          <DialogTrigger asChild>
            <Button>Créer un canal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouveau canal</DialogTitle>
            </DialogHeader>
            <CreateChannelDialog 
              onClose={() => setIsCreateChannelOpen(false)}
              onSuccess={handleCreateChannelSuccess}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1 border rounded-lg p-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {channels.map((channel) => (
                <Button
                  key={channel.id}
                  variant={selectedChannel === channel.id ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setSelectedChannel(channel.id)}
                >
                  <div>
                    <div className="font-medium">{channel.name}</div>
                    <div className="text-xs text-gray-500">
                      {channel.members_count} membres
                    </div>
                  </div>
                </Button>
              ))}
              {channels.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  Aucun canal disponible
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="col-span-3 border rounded-lg p-4">
          {selectedChannel ? (
            <ChannelMessages channelId={selectedChannel} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Sélectionnez un canal pour commencer à discuter
            </div>
          )}
        </div>
      </div>
    </div>
  );
};