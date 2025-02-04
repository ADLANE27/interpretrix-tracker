import { useState } from "react";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChannelMembersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

export const ChannelMembersDialog = ({
  isOpen,
  onClose,
  channelId,
}: ChannelMembersDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Fetch current channel members
  const { data: currentMembers = [], refetch: refetchMembers } = useQuery({
    queryKey: ["channel-members", channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channel_members")
        .select("user_id")
        .eq("channel_id", channelId);

      if (error) throw error;
      return data.map(member => member.user_id);
    },
  });

  // Fetch available users
  const { data: users = [] } = useQuery({
    queryKey: ["users", searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          role,
          users:user_id (
            id,
            interpreter_profiles!id (
              email,
              first_name,
              last_name
            )
          )
        `);

      if (error) throw error;

      return data.map(ur => ({
        id: ur.user_id,
        email: ur.users.interpreter_profiles.email,
        first_name: ur.users.interpreter_profiles.first_name,
        last_name: ur.users.interpreter_profiles.last_name,
        role: ur.role,
      }));
    },
  });

  const addMember = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("channel_members")
        .insert({
          channel_id: channelId,
          user_id: userId,
        });

      if (error) throw error;

      toast({
        title: "Membre ajouté",
        description: "L'utilisateur a été ajouté au canal avec succès",
      });

      refetchMembers();
    } catch (error) {
      console.error("Error adding member:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'utilisateur au canal",
        variant: "destructive",
      });
    }
  };

  const removeMember = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("channel_members")
        .delete()
        .eq("channel_id", channelId)
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Membre retiré",
        description: "L'utilisateur a été retiré du canal avec succès",
      });

      refetchMembers();
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Erreur",
        description: "Impossible de retirer l'utilisateur du canal",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user => 
    !currentMembers.includes(user.id) &&
    (user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.last_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Gérer les membres du canal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un utilisateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <ScrollArea className="h-[50vh]">
            <div className="space-y-4">
              {currentMembers.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Membres actuels</h3>
                  <div className="space-y-2">
                    {users
                      .filter(user => currentMembers.includes(user.id))
                      .map(user => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 rounded-lg border"
                        >
                          <div>
                            <p className="font-medium">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeMember(user.id)}
                          >
                            Retirer
                          </Button>
                        </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredUsers.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Utilisateurs disponibles</h3>
                  <div className="space-y-2">
                    {filteredUsers.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 rounded-lg border"
                      >
                        <div>
                          <p className="font-medium">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addMember(user.id)}
                        >
                          Ajouter
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};