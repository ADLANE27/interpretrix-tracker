import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Settings, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateChannelDialog } from "@/components/admin/CreateChannelDialog";
import { ChannelMemberManagement } from "@/components/admin/ChannelMemberManagement";
import { ChannelMembersDialog } from "@/components/chat/ChannelMembersDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

interface ChannelListProps {
  onChannelSelect: (channelId: string) => void;
  isAdminView?: boolean;
}

export const ChannelList = ({ onChannelSelect, isAdminView = false }: ChannelListProps) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const { toast } = useToast();

  const fetchChannels = async () => {
    try {
      const { data: channels, error } = await supabase
        .from("chat_channels")
        .select("*")
        .order("name");

      if (error) throw error;
      setChannels(channels);

      // Select first channel by default if none selected
      if (channels && channels.length > 0 && !selectedChannelId) {
        handleChannelSelect(channels[0].id);
      }
    } catch (error) {
      console.error("Error fetching channels:", error);
      toast({
        title: "Error",
        description: "Failed to fetch channels",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchChannels();
    subscribeToChannels();
  }, []);

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

  const handleDeleteChannel = async () => {
    if (!channelToDelete) return;

    try {
      // Delete channel members first
      const { error: membersError } = await supabase
        .from("channel_members")
        .delete()
        .eq("channel_id", channelToDelete.id);

      if (membersError) throw membersError;

      // Delete messages mentions
      const { error: mentionsError } = await supabase
        .from("message_mentions")
        .delete()
        .eq("channel_id", channelToDelete.id);

      if (mentionsError) throw mentionsError;

      // Delete messages
      const { error: messagesError } = await supabase
        .from("chat_messages")
        .delete()
        .eq("channel_id", channelToDelete.id);

      if (messagesError) throw messagesError;

      // Finally delete the channel
      const { error: channelError } = await supabase
        .from("chat_channels")
        .delete()
        .eq("id", channelToDelete.id);

      if (channelError) throw channelError;

      setChannels(channels.filter((channel) => channel.id !== channelToDelete.id));
      setChannelToDelete(null);
      setIsDeleteDialogOpen(false);

      toast({
        title: "Success",
        description: "Channel deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting channel:", error);
      toast({
        title: "Error",
        description: "Failed to delete channel",
        variant: "destructive",
      });
    }
  };

  const MemberManagementComponent = isAdminView ? ChannelMemberManagement : ChannelMembersDialog;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Canaux de discussion</h2>
        {isAdminView && (
          <Button onClick={() => setIsCreateDialogOpen(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau canal
          </Button>
        )}
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
                    ? 'bg-interpreter-navy text-white'
                    : 'hover:bg-accent/50'
                }`}
              >
                <div className="font-medium">{channel.name}</div>
                {channel.description && (
                  <div className="text-sm text-muted-foreground truncate">
                    {channel.description}
                  </div>
                )}
              </button>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity px-2 flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedChannelId(channel.id);
                    setIsMembersDialogOpen(true);
                  }}
                  className={`h-8 w-8 ${
                    selectedChannelId === channel.id ? 'text-white hover:bg-white/20' : 'hover:bg-accent'
                  }`}
                  title="Gérer les membres"
                >
                  {isAdminView ? <Settings className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                </Button>
                {isAdminView && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setChannelToDelete(channel);
                      setIsDeleteDialogOpen(true);
                    }}
                    className={`h-8 w-8 ${
                      selectedChannelId === channel.id 
                        ? 'text-white hover:bg-red-700/50' 
                        : 'text-destructive hover:bg-destructive/10'
                    }`}
                    title="Supprimer le canal"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {isAdminView && (
        <CreateChannelDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onChannelCreated={fetchChannels}
        />
      )}

      {selectedChannelId && (
        <MemberManagementComponent
          channelId={selectedChannelId}
          isOpen={isMembersDialogOpen}
          onClose={() => setIsMembersDialogOpen(false)}
        />
      )}

      {isAdminView && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer le canal</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer le canal "{channelToDelete?.name}" ? Cette action ne peut pas
                être annulée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteChannel} className="bg-destructive hover:bg-destructive/90">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};