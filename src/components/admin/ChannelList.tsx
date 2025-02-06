import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { ChannelMemberManagement } from "./ChannelMemberManagement";
import { useQuery } from "@tanstack/react-query";
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const { toast } = useToast();

  // Check if user is admin
  const { data: isAdmin } = useQuery({
    queryKey: ['isUserAdmin'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }
      
      return roles?.role === 'admin' || false;
    }
  });

  const fetchChannels = async () => {
    try {
      const { data: channels, error } = await supabase
        .from("chat_channels")
        .select("*")
        .order("name");

      if (error) throw error;
      setChannels(channels);
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
  }, []);

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
              onClick={() => {
                setSelectedChannelId(channel.id);
                onChannelSelect(channel.id);
              }}
            >
              <span className="flex-1 font-medium">{channel.name}</span>
              {isAdmin && (
                <div className="flex items-center gap-2">
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
                    <Settings className="h-4 w-4" />
                  </Button>
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
                </div>
              )}
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

      {selectedChannelId && (
        <ChannelMemberManagement
          channelId={selectedChannelId}
          isOpen={isMembersDialogOpen}
          onClose={() => setIsMembersDialogOpen(false)}
        />
      )}

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
    </div>
  );
};