import { useState } from "react";
import { UserPlus, UserMinus, Search, Users } from "lucide-react";
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
import { Input } from "@/components/ui/input";
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
  const [searchQuery, setSearchQuery] = useState("");
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

  const { data: nonMembers = [], refetch: refetchNonMembers } = useQuery({
    queryKey: ["non-channel-members", channelId, searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_available_channel_users', {
        channel_id: channelId,
        search_query: searchQuery
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
      refetchNonMembers();
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
      refetchNonMembers();
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
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gérer les membres du canal
            </DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un utilisateur par nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[50vh] rounded-md border">
            <div className="p-4 space-y-6">
              {members.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Membres actuels ({members.length})
                  </h3>
                  <div className="space-y-2">
                    {members.map(member => (
                      <div
                        key={member.user_id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div>
                          <p className="font-medium">
                            {member.first_name} {member.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member.email} • {member.role}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUserToRemove(member)}
                          className="hover:bg-destructive/10 hover:text-destructive transition-colors gap-2"
                        >
                          <UserMinus className="h-4 w-4" />
                          Retirer
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchQuery && nonMembers.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <UserPlus className="h-4 w-4" />
                    Utilisateurs disponibles ({nonMembers.length})
                  </h3>
                  <div className="space-y-2">
                    {nonMembers.map(user => (
                      <div
                        key={user.user_id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div>
                          <p className="font-medium">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {user.email} • {user.role}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addMember(user.user_id)}
                          className="hover:bg-primary/10 hover:text-primary transition-colors gap-2"
                        >
                          <UserPlus className="h-4 w-4" />
                          Ajouter
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchQuery && nonMembers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun utilisateur trouvé pour "{searchQuery}"
                </div>
              )}

              {!searchQuery && (
                <div className="text-center py-8 text-muted-foreground">
                  Commencez à taper pour rechercher des utilisateurs à ajouter
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
              Cette action ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToRemove(null)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToRemove && removeMember(userToRemove)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Retirer le membre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};