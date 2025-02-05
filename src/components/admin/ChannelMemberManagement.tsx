import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, UserPlus, UserMinus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface ChannelMemberManagementProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
}

interface Member {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'interpreter';
  joined_at: string;
}

interface AvailableUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'interpreter';
}

export const ChannelMemberManagement = ({
  isOpen,
  onClose,
  channelId,
}: ChannelMemberManagementProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const { toast } = useToast();

  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ["channel-members", channelId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_channel_members', {
        channel_id: channelId
      });

      if (error) throw error;
      return data as Member[];
    },
    enabled: isOpen,
  });

  const { data: availableUsers = [] } = useQuery({
    queryKey: ["available-users", searchQuery],
    queryFn: async () => {
      // First, get all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .ilike("email", `%${searchQuery}%`);

      if (rolesError) throw rolesError;

      // Then, get interpreter profiles
      const { data: interpreterProfiles, error: interpreterError } = await supabase
        .from("interpreter_profiles")
        .select("*");

      if (interpreterError) throw interpreterError;

      // Create a map of interpreter profiles
      const profilesMap = new Map(
        interpreterProfiles.map(profile => [profile.id, profile])
      );

      // Combine the data
      const users: AvailableUser[] = await Promise.all(
        userRoles.map(async (userRole) => {
          const profile = profilesMap.get(userRole.user_id);
          
          if (!profile) {
            const response = await supabase.functions.invoke('get-user-info', {
              body: { userId: userRole.user_id }
            });
            
            if (response.error) {
              console.error('Error fetching user info:', response.error);
              return {
                id: userRole.user_id,
                email: "",
                role: userRole.role,
                first_name: "",
                last_name: "",
              };
            }

            const userData = response.data;
            return {
              id: userRole.user_id,
              email: userData.email || "",
              role: userRole.role,
              first_name: userData.first_name || "",
              last_name: userData.last_name || "",
            };
          }

          return {
            id: userRole.user_id,
            email: profile.email,
            role: userRole.role,
            first_name: profile.first_name,
            last_name: profile.last_name,
          };
        })
      );

      return users;
    },
    enabled: isOpen && searchQuery.length > 0,
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
    } catch (error: any) {
      console.error("Error adding member:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'utilisateur au canal",
        variant: "destructive",
      });
    }
  };

  const removeMember = async (member: Member) => {
    try {
      const { error } = await supabase
        .from("channel_members")
        .delete()
        .eq("channel_id", channelId)
        .eq("user_id", member.user_id);

      if (error) throw error;

      toast({
        title: "Membre retiré",
        description: "L'utilisateur a été retiré du canal avec succès",
      });

      setMemberToRemove(null);
      refetchMembers();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast({
        title: "Erreur",
        description: "Impossible de retirer l'utilisateur du canal",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = availableUsers.filter(
    user => !members.some(member => member.user_id === user.id)
  );

  return (
    <>
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
                {members.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Membres actuels</h3>
                    <div className="space-y-2">
                      {members.map(member => (
                        <div
                          key={member.user_id}
                          className="flex items-center justify-between p-2 rounded-lg border"
                        >
                          <div>
                            <p className="font-medium">
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.email} ({member.role})
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setMemberToRemove(member)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {searchQuery && filteredUsers.length > 0 && (
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
                              {user.email} ({user.role})
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addMember(user.id)}
                          >
                            <UserPlus className="h-4 w-4" />
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

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le retrait du membre</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir retirer {memberToRemove?.first_name} {memberToRemove?.last_name} du canal ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToRemove(null)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && removeMember(memberToRemove)}
              className="bg-red-600 hover:bg-red-700"
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
