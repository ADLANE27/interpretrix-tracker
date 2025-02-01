import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, UserPlus, UserMinus, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: "admin_only" | "internal" | "external" | "mixed";
  created_at: string;
}

interface ChannelMember {
  id: string;
  user_id: string;
  channel_id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export const ChannelManagement = () => {
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDescription, setNewChannelDescription] = useState("");
  const [newChannelType, setNewChannelType] = useState<Channel["type"]>("mixed");
  const { toast } = useToast();

  const { data: channels, refetch: refetchChannels } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Channel[];
    },
  });

  const { data: channelMembers } = useQuery({
    queryKey: ["channel_members", selectedChannel?.id],
    enabled: !!selectedChannel,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channel_members")
        .select(`
          id,
          user_id,
          channel_id,
          users!inner (
            email,
            raw_user_meta_data->first_name,
            raw_user_meta_data->last_name
          )
        `)
        .eq("channel_id", selectedChannel?.id);

      if (error) throw error;

      return data?.map((member) => ({
        id: member.id,
        user_id: member.user_id,
        channel_id: member.channel_id,
        email: member.users.email,
        first_name: member.users.raw_user_meta_data.first_name,
        last_name: member.users.raw_user_meta_data.last_name,
      })) as ChannelMember[];
    },
  });

  const handleCreateChannel = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("channels").insert({
        name: newChannelName,
        description: newChannelDescription || null,
        type: newChannelType,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Channel created",
        description: "The channel has been created successfully",
      });

      setIsCreateChannelOpen(false);
      setNewChannelName("");
      setNewChannelDescription("");
      setNewChannelType("mixed");
      refetchChannels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
        <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Channel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Channel</DialogTitle>
              <DialogDescription>
                Create a new channel for communication with interpreters
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Channel Name</Label>
                <Input
                  id="name"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="Enter channel name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newChannelDescription}
                  onChange={(e) => setNewChannelDescription(e.target.value)}
                  placeholder="Enter channel description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Channel Type</Label>
                <Select
                  value={newChannelType}
                  onValueChange={(value: Channel["type"]) =>
                    setNewChannelType(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select channel type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin_only">Admin Only</SelectItem>
                    <SelectItem value="internal">Internal Interpreters</SelectItem>
                    <SelectItem value="external">External Interpreters</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={handleCreateChannel}
                disabled={!newChannelName}
              >
                Create Channel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <ScrollArea className="h-[600px] rounded-lg border">
            <div className="p-4 space-y-2">
              {channels?.map((channel) => (
                <Button
                  key={channel.id}
                  variant={
                    selectedChannel?.id === channel.id ? "default" : "ghost"
                  }
                  className="w-full justify-start"
                  onClick={() => setSelectedChannel(channel)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  <div className="truncate">
                    <div className="font-medium">{channel.name}</div>
                    {channel.description && (
                      <div className="text-sm text-gray-500 truncate">
                        {channel.description}
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="lg:col-span-3">
          {selectedChannel ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">{selectedChannel.name}</h3>
                <div className="space-x-2">
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                  <Button variant="outline" size="sm">
                    <UserMinus className="h-4 w-4 mr-2" />
                    Remove Member
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border">
                <div className="p-4">
                  <h4 className="font-medium mb-4">Channel Members</h4>
                  <div className="space-y-2">
                    {channelMembers?.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                      >
                        <div>
                          <div className="font-medium">
                            {member.first_name} {member.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[600px] flex items-center justify-center text-gray-500">
              Select a channel to manage its members
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
