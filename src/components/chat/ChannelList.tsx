import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateChannelDialog } from "@/components/admin/CreateChannelDialog";
import { ChannelMemberManagement } from "@/components/admin/ChannelMemberManagement";
import { Badge } from "@/components/ui/badge";
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
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [unreadMentions, setUnreadMentions] = useState<{ [key: string]: number }>({});
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

      console.log('Fetching unread mentions for user:', user.id);
      const { data: mentions, error } = await supabase
        .from('message_mentions')
        .select('channel_id, count(*)')
        .eq('mentioned_user_id', user.id)
        .eq('status', 'unread')
        .groupBy('channel_id');

      if (error) {
        console.error('Error fetching unread mentions:', error);
        return;
      }

      const mentionCounts = mentions.reduce((acc: { [key: string]: number }, mention) => {
        acc[mention.channel_id] = parseInt(mention.count);
        return acc;
      }, {});

      console.log('Unread mentions by channel:', mentionCounts);
      setUnreadMentions(mentionCounts);
    } catch (error) {
      console.error('Error in fetchUnreadMentions:', error);
    }
  };

  // Set up real-time subscription for mentions
  useEffect(() => {
    fetchUnreadMentions();

    const channel = supabase.channel('interpreter-mentions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_mentions'
        },
        (payload) => {
          console.log('Mentions update received:', payload);
          fetchUnreadMentions();
        }
      )
      .subscribe((status) => {
        console.log('Mentions subscription status:', status);
      });

    return () => {
      console.log('Cleaning up mentions subscription');
      supabase.removeChannel(channel);
    };
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

      fetchChannels();
      setChannelToDelete(null);
      setIsDeleteDialogOpen(false);

      toast({
        title: "Succès",
        description: "Le canal a été supprimé avec succès",
      });
    } catch (error) {
      console.error("Error deleting channel:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le canal",
        variant: "destructive",
      });
    }
  };

  const handleChannelSelect = async (channelId: string) => {
    setSelectedChannelId(channelId);
    onChannelSelect(channelId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark mentions as read when entering the channel
      const { error } = await supabase
        .from('message_mentions')
        .update({ status: 'read' })
        .eq('mentioned_user_id', user.id)
        .eq('channel_id', channelId);

      if (error) throw error;

      // Update local state to remove the badge
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
                  <Badge 
                    variant="destructive" 
                    className="ml-2"
                  >
                    {unreadMentions[channel.id]}
                  </Badge>
                )}
              </div>
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

      {isAdmin && (
        <>
          <CreateChannelDialog
            isOpen={isCreateDialogOpen}
            onClose={() => setIsCreateDialogOpen(false)}
            onChannelCreated={fetchChannels}
          />

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
        </>
      )}
    </div>
  );
};