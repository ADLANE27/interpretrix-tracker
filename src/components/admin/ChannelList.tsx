import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { ChannelMemberManagement } from "./ChannelMemberManagement";
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
import { Badge } from "@/components/ui/badge";

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
  const [unreadMentions, setUnreadMentions] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchChannels();
    subscribeToMentions();
  }, []);

  const subscribeToMentions = () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const channel = supabase
      .channel('mentions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_mentions',
          filter: `mentioned_user_id=eq.${user.id}`
        },
        () => {
          fetchUnreadMentions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchUnreadMentions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: mentions, error } = await supabase
        .from('message_mentions')
        .select('channel_id, count')
        .eq('mentioned_user_id', user.id)
        .eq('status', 'unread')
        .groupBy('channel_id');

      if (error) throw error;

      const mentionsCount = mentions.reduce((acc, curr) => ({
        ...acc,
        [curr.channel_id]: parseInt(curr.count)
      }), {});

      setUnreadMentions(mentionsCount);
    } catch (error) {
      console.error('Error fetching unread mentions:', error);
    }
  };

  const fetchChannels = async () => {
    try {
      const { data: channels, error } = await supabase
        .from("chat_channels")
        .select("*")
        .order("name");

      if (error) throw error;
      setChannels(channels);
      fetchUnreadMentions();
    } catch (error) {
      console.error("Error fetching channels:", error);
      toast({
        title: "Error",
        description: "Failed to fetch channels",
        variant: "destructive",
      });
    }
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Channels</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Channel
        </Button>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-2">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer border relative"
              onClick={() => {
                setSelectedChannelId(channel.id);
                onChannelSelect(channel.id);
              }}
            >
              <div className="flex items-center gap-2 flex-1">
                <span className="font-medium">{channel.name}</span>
                {unreadMentions[channel.id] > 0 && (
                  <Badge variant="destructive" className="h-5 w-5 rounded-full flex items-center justify-center">
                    {unreadMentions[channel.id]}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedChannelId(channel.id);
                    setIsMembersDialogOpen(true);
                  }}
                  className="flex items-center gap-1 hover:bg-accent"
                  title="Manage members"
                >
                  <Users className="h-5 w-5" />
                  <span className="hidden sm:inline">Members</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setChannelToDelete(channel);
                    setIsDeleteDialogOpen(true);
                  }}
                  className="flex items-center gap-1 hover:bg-red-100 dark:hover:bg-red-900"
                  title="Delete channel"
                >
                  <Trash2 className="h-5 w-5 text-red-500" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

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
            <AlertDialogTitle>Delete Channel</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the channel "{channelToDelete?.name}"? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChannel} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
