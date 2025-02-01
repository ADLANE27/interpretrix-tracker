import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AddChannelMemberForm } from "./AddChannelMemberForm";
import { Send, Plus, UserPlus } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  members_count: number;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

export const GroupChatManager = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDescription, setNewChannelDescription] = useState("");
  const { toast } = useToast();

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error("Error fetching channels:", error);
      toast({
        title: "Error",
        description: "Failed to load channels",
        variant: "destructive",
      });
    }
  };

  const fetchMessages = async (channelId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  };

  const createChannel = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("channels")
        .insert({
          name: newChannelName,
          description: newChannelDescription,
          type: "internal",
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add the creator as a member
      const { error: memberError } = await supabase
        .from("channel_members")
        .insert({
          channel_id: data.id,
          user_id: user.id,
          added_by: user.id,
        });

      if (memberError) throw memberError;

      toast({
        title: "Success",
        description: "Channel created successfully",
      });

      setIsCreateChannelOpen(false);
      setNewChannelName("");
      setNewChannelDescription("");
      fetchChannels();
    } catch (error) {
      console.error("Error creating channel:", error);
      toast({
        title: "Error",
        description: "Failed to create channel",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!selectedChannel || !newMessage.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("messages")
        .insert({
          channel_id: selectedChannel,
          content: newMessage.trim(),
          sender_id: user.id,
        });

      if (error) throw error;
      setNewMessage("");
      fetchMessages(selectedChannel);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Group Chats</h2>
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
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="channelName">Channel Name</Label>
                <Input
                  id="channelName"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="Enter channel name"
                />
              </div>
              <div>
                <Label htmlFor="channelDescription">Description (optional)</Label>
                <Input
                  id="channelDescription"
                  value={newChannelDescription}
                  onChange={(e) => setNewChannelDescription(e.target.value)}
                  placeholder="Enter channel description"
                />
              </div>
              <Button onClick={createChannel} className="w-full">
                Create Channel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className={`p-3 rounded-lg cursor-pointer hover:bg-gray-100 ${
                    selectedChannel === channel.id ? "bg-gray-100" : ""
                  }`}
                  onClick={() => {
                    setSelectedChannel(channel.id);
                    fetchMessages(channel.id);
                  }}
                >
                  <div className="font-medium">{channel.name}</div>
                  {channel.description && (
                    <div className="text-sm text-gray-500">{channel.description}</div>
                  )}
                  <div className="text-xs text-gray-400">
                    {channel.members_count} members
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="col-span-2 border rounded-lg p-4">
          {selectedChannel ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">
                  {channels.find((c) => c.id === selectedChannel)?.name}
                </h3>
                <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Member to Channel</DialogTitle>
                    </DialogHeader>
                    <AddChannelMemberForm
                      channelId={selectedChannel}
                      onSuccess={() => {
                        setIsAddMemberOpen(false);
                        fetchChannels();
                      }}
                      onCancel={() => setIsAddMemberOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              <ScrollArea className="h-[500px] mb-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className="p-3 rounded-lg bg-gray-50"
                    >
                      <div className="text-sm">{message.content}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(message.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      sendMessage();
                    }
                  }}
                />
                <Button onClick={sendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Select a channel to start messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
};