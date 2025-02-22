
import { useState } from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface NewDirectMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onChannelCreated: () => void;
}

export function NewDirectMessageDialog({
  isOpen,
  onClose,
  onChannelCreated,
}: NewDirectMessageDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const searchUsers = async (query: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_available_channel_users', {
          channel_id: null,
          search_query: query
        });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (value.length >= 2) {
      searchUsers(value);
    } else {
      setUsers([]);
    }
  };

  const startDirectMessage = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .rpc('get_or_create_direct_channel', {
          user1_id: user.id,
          user2_id: userId
        });

      if (error) throw error;

      onChannelCreated();
      onClose();
      
      toast({
        title: "Success",
        description: "Direct message channel created",
      });
    } catch (error) {
      console.error('Error creating direct message:', error);
      toast({
        title: "Error",
        description: "Failed to create direct message",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Direct Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : users.length > 0 ? (
              users.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-2 hover:bg-accent rounded-lg cursor-pointer"
                  onClick={() => startDirectMessage(user.user_id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {`${user.first_name[0]}${user.last_name[0]}`}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{`${user.first_name} ${user.last_name}`}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-secondary px-2 py-1 rounded">
                    {user.role}
                  </span>
                </div>
              ))
            ) : searchQuery.length >= 2 ? (
              <div className="text-center text-sm text-muted-foreground">
                No users found
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
