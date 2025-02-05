import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Users, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { ChannelMembersDialog } from "./ChannelMembersDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Channel {
  id: string;
  name: string;
  description: string | null;
}

export const ChannelList = ({ onChannelSelect }: { onChannelSelect: (channelId: string) => void }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchChannels();
    subscribeToChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChannels(data || []);

      // Select first channel by default if none selected
      if (data && data.length > 0 && !selectedChannelId) {
        handleChannelSelect(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les canaux de discussion",
        variant: "destructive",
      });
    }
  };

  const subscribeToChannels = () => {
    const channel = supabase
      .channel('chat-channels')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_channels'
        },
        () => {
          fetchChannels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
    onChannelSelect(channelId);
  };

  const handleDeleteChannel = async (channelId: string) => {
    try {
      const { error } = await supabase
        .from('chat_channels')
        .delete()
        .eq('id', channelId);

      if (error) throw error;

      toast({
        title: "Canal supprimé",
        description: "Le canal a été supprimé avec succès",
      });

      // Select another channel if the deleted one was selected
      if (selectedChannelId === channelId) {
        const remainingChannels = channels.filter(c => c.id !== channelId);
        if (remainingChannels.length > 0) {
          handleChannelSelect(remainingChannels[0].id);
        } else {
          setSelectedChannelId(null);
        }
      }
    } catch (error) {
      console.error('Error deleting channel:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le canal",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Canaux de discussion</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCreateDialogOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouveau canal
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="flex items-center justify-between group"
            >
              <button
                onClick={() => handleChannelSelect(channel.id)}
                className={`flex-1 text-left px-4 py-2 rounded-lg transition-colors ${
                  selectedChannelId === channel.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="font-medium">{channel.name}</div>
                {channel.description && (
                  <div className="text-sm text-muted-foreground truncate">
                    {channel.description}
                  </div>
                )}
              </button>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity px-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setSelectedChannelId(channel.id);
                      setIsMembersDialogOpen(true);
                    }}>
                      <Users className="h-4 w-4 mr-2" />
                      Gérer les membres
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <CreateChannelDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />

      {selectedChannelId && (
        <ChannelMembersDialog
          isOpen={isMembersDialogOpen}
          onClose={() => setIsMembersDialogOpen(false)}
          channelId={selectedChannelId}
        />
      )}
    </div>
  );
};
