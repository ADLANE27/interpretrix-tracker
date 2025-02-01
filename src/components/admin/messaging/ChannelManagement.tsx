import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateChannelForm } from "./CreateChannelForm";
import { ChannelMembersList } from "./ChannelMembersList";
import { AddChannelMemberForm } from "./AddChannelMemberForm";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: "admin_only" | "internal" | "external" | "mixed";
  created_at: string;
}

export const ChannelManagement = () => {
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

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

  return (
    <div className="space-y-6">
      <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Channel</DialogTitle>
            <DialogDescription>
              Create a new channel for communication with interpreters
            </DialogDescription>
          </DialogHeader>
          <CreateChannelForm
            onSuccess={() => {
              setIsCreateChannelOpen(false);
              refetchChannels();
            }}
            onCancel={() => setIsCreateChannelOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Channel Member</DialogTitle>
            <DialogDescription>
              Add a new member to the channel
            </DialogDescription>
          </DialogHeader>
          {selectedChannel && (
            <AddChannelMemberForm
              channelId={selectedChannel.id}
              onSuccess={() => setIsAddMemberOpen(false)}
              onCancel={() => setIsAddMemberOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Channel Management</h2>
        <Button onClick={() => setIsCreateChannelOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Channel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <ScrollArea className="h-[600px] rounded-lg border">
            <div className="p-4 space-y-2">
              {channels?.map((channel) => (
                <Button
                  key={channel.id}
                  variant={selectedChannel?.id === channel.id ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedChannel(channel)}
                >
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
                <Button onClick={() => setIsAddMemberOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </div>

              <div className="rounded-lg border">
                <div className="p-4">
                  <h4 className="font-medium mb-4">Channel Members</h4>
                  <ChannelMembersList channelId={selectedChannel.id} />
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