import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, MoreVertical, UserPlus } from "lucide-react";
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
import { AddChannelMemberForm } from "./AddChannelMemberForm";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  members_count: number;
}

export const TeamChat = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedChannelForMember, setSelectedChannelForMember] = useState<string | null>(null);
  const { toast } = useToast();

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

  const handleAddMemberSuccess = () => {
    setIsAddMemberOpen(false);
    setSelectedChannelForMember(null);
    fetchChannels();
    toast({
      title: "Succès",
      description: "Membre ajouté avec succès",
    });
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Sidebar */}
      <div className="w-64 bg-chat-sidebar flex flex-col h-full flex-shrink-0">
        <div className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-white">
              <h2 className="text-lg font-semibold">Channels</h2>
            </div>
            
            <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Créer un nouveau groupe
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un nouveau groupe</DialogTitle>
                </DialogHeader>
                <CreateChannelDialog 
                  onClose={() => setIsCreateChannelOpen(false)}
                  onSuccess={handleCreateChannelSuccess}
                />
              </DialogContent>
            </Dialog>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-chat-searchText" />
              <Input 
                placeholder="Search channels..."
                className="w-full bg-chat-searchBg border-0 pl-10 text-white placeholder:text-chat-searchText focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-2 space-y-1">
            {channels.map((channel) => (
              <div key={channel.id} className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  className={`flex-1 justify-between px-3 py-2 text-sm ${
                    selectedChannel === channel.id
                      ? "bg-chat-selected text-white hover:bg-chat-selected"
                      : "text-gray-300 hover:bg-chat-searchBg hover:text-white"
                  }`}
                  onClick={() => setSelectedChannel(channel.id)}
                >
                  <span className="flex items-center">
                    # {channel.name}
                  </span>
                  {channel.members_count > 0 && (
                    <span className="text-xs bg-chat-channelCount/20 text-chat-channelCount px-2 py-1 rounded-full">
                      {channel.members_count}
                    </span>
                  )}
                </Button>
                <Dialog 
                  open={isAddMemberOpen && selectedChannelForMember === channel.id} 
                  onOpenChange={(open) => {
                    setIsAddMemberOpen(open);
                    if (!open) setSelectedChannelForMember(null);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-gray-300 hover:bg-chat-searchBg hover:text-white"
                      onClick={() => setSelectedChannelForMember(channel.id)}
                      title="Ajouter un membre"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter un membre à {channel.name}</DialogTitle>
                    </DialogHeader>
                    <AddChannelMemberForm
                      channelId={channel.id}
                      onSuccess={handleAddMemberSuccess}
                      onCancel={() => {
                        setIsAddMemberOpen(false);
                        setSelectedChannelForMember(null);
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white h-full">
        {selectedChannel ? (
          <>
            <div className="h-14 border-b border-chat-channelBorder flex items-center justify-between px-4 bg-chat-channelHeader">
              <div className="flex items-center space-x-2">
                <span className="font-medium">
                  #{channels.find(c => c.id === selectedChannel)?.name}
                </span>
                <span className="text-sm text-gray-500">
                  {channels.find(c => c.id === selectedChannel)?.members_count} members
                </span>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5 text-gray-500" />
              </Button>
            </div>
            <ChannelMessages channelId={selectedChannel} />
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a channel to start chatting
          </div>
        )}
      </div>
    </div>
  );
};