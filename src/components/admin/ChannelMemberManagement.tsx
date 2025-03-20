
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChannelMemberManagementProps {
  channelId: string;
  onClose: () => void;
}

export const ChannelMemberManagement = ({ channelId, onClose }: ChannelMemberManagementProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load channel members
  useEffect(() => {
    const fetchMembers = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .rpc('get_channel_members', {
            channel_id: channelId
          });

        if (error) throw error;
        setMembers(data || []);
      } catch (error) {
        console.error('Error fetching channel members:', error);
        toast({
          title: "Error",
          description: "Failed to load channel members",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [channelId, toast]);

  // Search available users
  const searchUsers = async (query: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_available_channel_users', {
          channel_id: channelId,
          search_query: query
        });

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive",
      });
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (value.length >= 2) {
      searchUsers(value);
    } else {
      setAvailableUsers([]);
    }
  };

  const addMember = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('channel_members')
        .insert({
          channel_id: channelId,
          user_id: userId
        });

      if (error) throw error;

      // Refresh members list
      const { data: updatedMembers, error: membersError } = await supabase
        .rpc('get_channel_members', {
          channel_id: channelId
        });

      if (membersError) throw membersError;
      setMembers(updatedMembers || []);

      // Clear search and available users
      setSearchQuery("");
      setAvailableUsers([]);

      toast({
        title: "Success",
        description: "User added to channel",
      });
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: "Error",
        description: "Failed to add user to channel",
        variant: "destructive",
      });
    }
  };

  const removeMember = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update the local list
      setMembers(prev => prev.filter(member => member.user_id !== userId));

      toast({
        title: "Success",
        description: "User removed from channel",
      });
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: "Failed to remove user from channel",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="sm" onClick={onClose} className="flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Chat</span>
        </Button>
        <h2 className="font-semibold">Manage Channel Members</h2>
        <div className="w-20"></div> {/* For balance */}
      </div>

      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users to add..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Available users to add */}
        {searchQuery.length >= 2 && (
          <div className="mt-2">
            <h3 className="text-sm font-medium mb-2">Available Users</h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {availableUsers.length > 0 ? (
                availableUsers.map(user => (
                  <div key={user.user_id} className="flex items-center justify-between p-2 bg-accent/30 rounded">
                    <div>
                      <p className="font-medium">{user.first_name} {user.last_name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => addMember(user.user_id)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No users found</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        <h3 className="font-medium mb-3">Current Channel Members</h3>
        
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
          </div>
        ) : members.length > 0 ? (
          <div className="space-y-2">
            {members.map(member => (
              <div key={member.user_id} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{member.first_name} {member.last_name}</span>
                    {member.role && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        {member.role}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => removeMember(member.user_id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">No members in this channel</p>
        )}
      </div>
    </div>
  );
};
