import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Users, Bell, Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { ChannelMemberManagement } from "./ChannelMemberManagement";
import { Badge } from "@/components/ui/badge";
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Channel {
  id: string;
  name: string;
  description: string | null;
}

interface Mention {
  message_id: string;
  message_content: string;
  mentioning_user: {
    first_name: string;
    last_name: string;
  } | null;
  channel_name: string;
  created_at: string;
}

export const ChannelList = ({ onChannelSelect }: { onChannelSelect: (channelId: string) => void }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [unreadMentions, setUnreadMentions] = useState<Mention[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchChannels();
    fetchUnreadMentions();
    subscribeToChannels();
    subscribeToMentions();
  }, []);

  const fetchUnreadMentions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('message_mentions')
        .select(`
          message_id,
          chat_messages!inner (
            content,
            chat_channels!inner (
              name
            )
          ),
          mentioning_user:mentioning_user_id (
            first_name,
            last_name
          ),
          created_at
        `)
        .eq('mentioned_user_id', user.id)
        .eq('status', 'unread')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching unread mentions:', error);
        return;
      }

      const formattedMentions = data.map(mention => ({
        message_id: mention.message_id,
        message_content: mention.chat_messages.content,
        mentioning_user: mention.mentioning_user,
        channel_name: mention.chat_messages.chat_channels.name,
        created_at: mention.created_at,
      }));

      setUnreadMentions(formattedMentions);
    } catch (error) {
      console.error('Error fetching unread mentions:', error);
    }
  };

  const subscribeToMentions = () => {
    const channel = supabase
      .channel('mentions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_mentions'
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

  const handleDeleteChannel = async (channel: Channel) => {
    setChannelToDelete(channel);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteChannel = async () => {
    if (!channelToDelete) return;

    try {
      const { error } = await supabase
        .from('chat_channels')
        .delete()
        .eq('id', channelToDelete.id);

      if (error) throw error;

      toast({
        title: "Canal supprimé",
        description: "Le canal a été supprimé avec succès",
      });

      if (selectedChannelId === channelToDelete.id) {
        const remainingChannels = channels.filter(c => c.id !== channelToDelete.id);
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
    } finally {
      setIsDeleteDialogOpen(false);
      setChannelToDelete(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Canaux de discussion</h3>
        <div className="flex items-center gap-2">
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {unreadMentions.length > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
                  >
                    {unreadMentions.length}
                  </Badge>
                )}
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-semibold">Mentions non lues</h4>
                <ScrollArea className="h-[200px]">
                  {unreadMentions.length > 0 ? (
                    <div className="space-y-2">
                      {unreadMentions.map((mention) => (
                        <div 
                          key={mention.message_id} 
                          className="p-2 rounded-lg bg-muted/50 space-y-1"
                        >
                          <p className="text-sm font-medium">
                            {mention.mentioning_user ? 
                              `${mention.mentioning_user.first_name} ${mention.mentioning_user.last_name}` :
                              'Utilisateur inconnu'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {mention.message_content}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            dans {mention.channel_name}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucune mention non lue
                    </p>
                  )}
                </ScrollArea>
              </div>
            </HoverCardContent>
          </HoverCard>
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
      </div>
      
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="flex items-center justify-between group hover:bg-muted/50 rounded-lg transition-colors"
            >
              <button
                onClick={() => handleChannelSelect(channel.id)}
                className={`flex-1 text-left px-4 py-2 rounded-lg transition-colors ${
                  selectedChannelId === channel.id
                    ? 'bg-primary text-primary-foreground'
                    : ''
                }`}
              >
                <div className="font-medium">{channel.name}</div>
                {channel.description && (
                  <div className="text-sm text-muted-foreground truncate">
                    {channel.description}
                  </div>
                )}
              </button>
              <div className="flex items-center gap-2 px-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChannelId(channel.id);
                        setIsMembersDialogOpen(true);
                      }}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Gérer les membres
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChannel(channel);
                      }}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Supprimer le canal
                  </TooltipContent>
                </Tooltip>
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
        <ChannelMemberManagement
          isOpen={isMembersDialogOpen}
          onClose={() => setIsMembersDialogOpen(false)}
          channelId={selectedChannelId}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Cette action est irréversible. Cela supprimera définitivement le canal
                "{channelToDelete?.name}" et tous ses messages.
              </p>
              <p className="font-medium text-destructive">
                Les membres du canal n'auront plus accès à l'historique des conversations.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteChannel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};