
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Bell, Trash2, Settings, Pencil } from "lucide-react";
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
import { Input } from "@/components/ui/input";

interface Channel {
  id: string;
  display_name: string;
  description: string | null;
  channel_type: 'direct' | 'group';
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface DeleteChannelConfirmation {
  isOpen: boolean;
  channelId: string | null;
  channelName: string;
}

export const InterpreterChannelList = ({ 
  onChannelSelect 
}: { 
  onChannelSelect: (channelId: string) => void 
}) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [unreadMentions, setUnreadMentions] = useState<{ [key: string]: number }>({});
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteChannelConfirmation>({
    isOpen: false,
    channelId: null,
    channelName: ''
  });
  const [editingChannel, setEditingChannel] = useState<{id: string, name: string} | null>(null);
  const { toast } = useToast();

  const isValidChannelType = (type: string): type is 'direct' | 'group' => {
    return type === 'direct' || type === 'group';
  };

  const fetchChannels = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: rawChannels, error } = await supabase
        .rpc('get_channels_with_display_names', { current_user_id: user.id });

      if (error) throw error;

      const validChannels: Channel[] = (rawChannels || []).map(channel => {
        if (!isValidChannelType(channel.channel_type)) {
          console.error(`Invalid channel type: ${channel.channel_type}`);
          return { ...channel, channel_type: 'group' as const };
        }
        return channel as Channel;
      });

      setChannels(validChannels);
    } catch (error) {
      console.error("[InterpreterChat] Error fetching channels:", error);
      toast({
        title: "Error",
        description: "Failed to fetch channels",
        variant: "destructive",
      });
    }
  };

  const handleRename = async (channelId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('chat_channels')
        .update({ name: newName.trim() })
        .eq('id', channelId);

      if (error) throw error;

      setEditingChannel(null);
      await fetchChannels();
      
      toast({
        title: "Success",
        description: "Channel renamed successfully"
      });
    } catch (error) {
      console.error('[InterpreterChat] Error renaming channel:', error);
      toast({
        title: "Error",
        description: "Failed to rename channel",
        variant: "destructive"
      });
    }
  };

  const removeFromChannel = async (channelId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('channel_members')
        .delete()
        .match({ 
          channel_id: channelId,
          user_id: user.id 
        });

      if (error) throw error;

      await fetchChannels();
      
      toast({
        title: "Success",
        description: "Removed from conversation"
      });
    } catch (error) {
      console.error('[InterpreterChat] Error removing from channel:', error);
      toast({
        title: "Error",
        description: "Failed to remove from conversation",
        variant: "destructive"
      });
    }
  };

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

    const channel = supabase.channel('interpreter-mentions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_mentions' },
        async (payload) => {
          console.log('[InterpreterChat] Mention update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && payload.new.mentioned_user_id === user.id) {
              toast({
                title: "New Mention",
                description: (
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <span>You were mentioned in a message</span>
                  </div>
                )
              });
            }
          }
          
          fetchUnreadMentions();
        }
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
    <>
      <ScrollArea className="h-[calc(100vh-400px)]">
        <div className="space-y-2 pr-4">
          {channels.length === 0 ? (
            <div className="text-center text-muted-foreground p-4">
              You are not a member of any chat channels
            </div>
          ) : (
            channels.map((channel) => (
              <div
                key={channel.id}
                className={`
                  group relative flex items-center gap-3 p-3 rounded-xl
                  cursor-pointer transition-all duration-200
                  hover:scale-[0.98] active:scale-[0.97]
                  ${selectedChannelId === channel.id 
                    ? 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300' 
                    : 'hover:bg-purple-100/50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300'}
                `}
                onClick={() => handleChannelSelect(channel.id)}
              >
                <MessageCircle className={`h-5 w-5 ${
                  selectedChannelId === channel.id 
                    ? 'text-purple-500' 
                    : 'text-gray-500'
                }`} />
                <div className="flex items-center justify-between flex-1 min-w-0">
                  {editingChannel?.id === channel.id ? (
                    <Input
                      value={editingChannel.name}
                      onChange={(e) => setEditingChannel({ ...editingChannel, name: e.target.value })}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          handleRename(channel.id, editingChannel.name);
                        } else if (e.key === 'Escape') {
                          setEditingChannel(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-8"
                      autoFocus
                    />
                  ) : (
                    <span className="font-medium truncate">{channel.display_name}</span>
                  )}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {unreadMentions[channel.id] > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="animate-pulse shadow-lg"
                      >
                        <Bell className="h-3 w-3 mr-1" />
                        {unreadMentions[channel.id]}
                      </Badge>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("Settings clicked for channel:", channel.id);
                      }}
                      className="p-1.5 rounded-full hover:bg-purple-200/50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-gray-500 hover:text-purple-500" />
                    </button>
                    {channel.channel_type === 'direct' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmation({
                            isOpen: true,
                            channelId: channel.id,
                            channelName: channel.display_name
                          });
                        }}
                        className="p-1.5 rounded-full hover:bg-red-200/50 dark:hover:bg-red-900/50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <AlertDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(isOpen) => 
          setDeleteConfirmation(prev => ({ ...prev, isOpen }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the conversation with {deleteConfirmation.channelName}? 
              You can still message them again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmation.channelId) {
                  removeFromChannel(deleteConfirmation.channelId);
                }
                setDeleteConfirmation({
                  isOpen: false,
                  channelId: null,
                  channelName: ''
                });
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
