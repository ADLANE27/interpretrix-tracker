
import { useState } from "react";
import { UserPlus, UserMinus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  user_id: string;
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
  const [showAvailableUsers, setShowAvailableUsers] = useState(false);
  const [userToRemove, setUserToRemove] = useState<Member | null>(null);
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

  const { data: availableUsers = [], refetch: refetchAvailableUsers } = useQuery({
    queryKey: ["available-users", channelId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_available_channel_users', {
        channel_id: channelId,
        search_query: '' // Empty search to get all users
      });

      if (error) throw error;
      return data as AvailableUser[];
    },
    enabled: isOpen,
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
      refetchAvailableUsers();
      setShowAvailableUsers(false);
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

      setUserToRemove(null);
      refetchMembers();
      refetchAvailableUsers();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast({
        title: "Erreur",
        description: "Impossible de retirer l'utilisateur du canal",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Gérer les membres du canal</DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[50vh]">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={() => setShowAvailableUsers(!showAvailableUsers)}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Ajouter un membre
                </Button>
              </div>

              {showAvailableUsers && availableUsers.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Utilisateurs disponibles</h3>
                  <div className="space-y-2">
                    {availableUsers.map(user => (
                      <div
                        key={user.user_id}
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
                          onClick={() => addMember(user.user_id)}
                          className="gap-2"
                        >
                          <UserPlus className="h-4 w-4" />
                          Ajouter
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                          onClick={() => setUserToRemove(member)}
                          className="gap-2"
                        >
                          <UserMinus className="h-4 w-4" />
                          Retirer
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le retrait du membre</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir retirer {userToRemove?.first_name} {userToRemove?.last_name} du canal ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToRemove(null)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToRemove && removeMember(userToRemove)}
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
