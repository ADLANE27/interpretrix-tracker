import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "admin" | "interpreter";
}

interface CreateChannelDialogProps {
  onClose: () => void;
}

export const CreateChannelDialog = ({ onClose }: CreateChannelDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      // Fetch user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Fetch interpreter profiles
      const { data: interpreterProfiles, error: profilesError } = await supabase
        .from("interpreter_profiles")
        .select("*");

      if (profilesError) throw profilesError;

      const profilesMap = new Map(
        interpreterProfiles.map(profile => [profile.id, profile])
      );

      const usersData = await Promise.all(
        userRoles.map(async (userRole) => {
          const profile = profilesMap.get(userRole.user_id);
          
          if (!profile) {
            const response = await supabase.functions.invoke('get-user-info', {
              body: { userId: userRole.user_id }
            });
            
            if (response.error) {
              console.error('Error fetching user info:', response.error);
              return null;
            }

            const userData = response.data;
            return {
              id: userRole.user_id,
              email: userData.email || "",
              first_name: userData.first_name || "",
              last_name: userData.last_name || "",
              role: userRole.role,
            };
          }

          return {
            id: userRole.user_id,
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            role: userRole.role,
          };
        })
      );

      setUsers(usersData.filter((user): user is User => user !== null));
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    }
  };

  const handleCreateChannel = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Channel name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create channel
      const { data: channel, error: channelError } = await supabase
        .from("channels")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          created_by: user.id,
          type: "internal",
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Add creator as member
      const { error: memberError } = await supabase
        .from("channel_members")
        .insert({
          channel_id: channel.id,
          user_id: user.id,
          added_by: user.id,
        });

      if (memberError) throw memberError;

      // Add selected users as members
      if (selectedUsers.length > 0) {
        const { error: membersError } = await supabase
          .from("channel_members")
          .insert(
            selectedUsers.map(userId => ({
              channel_id: channel.id,
              user_id: userId,
              added_by: user.id,
            }))
          );

        if (membersError) throw membersError;
      }

      toast({
        title: "Success",
        description: "Channel created successfully",
      });

      onClose();
    } catch (error) {
      console.error("Error creating channel:", error);
      toast({
        title: "Error",
        description: "Failed to create channel",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Channel Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter channel name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter channel description"
        />
      </div>

      <div className="space-y-2">
        <Label>Add Members</Label>
        <ScrollArea className="h-[200px] border rounded-md p-4">
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.id} className="flex items-center space-x-2">
                <Checkbox
                  id={user.id}
                  checked={selectedUsers.includes(user.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedUsers([...selectedUsers, user.id]);
                    } else {
                      setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                    }
                  }}
                />
                <Label htmlFor={user.id} className="flex-1">
                  {user.first_name} {user.last_name} ({user.role})
                </Label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleCreateChannel} disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Channel"}
        </Button>
      </div>
    </div>
  );
};