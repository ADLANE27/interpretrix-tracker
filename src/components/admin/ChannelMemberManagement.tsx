import { useState, useEffect } from "react";
import { UserPlus, UserMinus, Search, Users, Info } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  const queryClient = useQueryClient();

  // Setup realtime subscription for member changes
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase
      .channel('member-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channel_members',
          filter: `channel_id=eq.${channelId}`
        },
        () => {
          console.log('Channel members changed, refreshing data...');
          queryClient.invalidateQueries({ queryKey: ["channel-members", channelId] });
          queryClient.invalidateQueries({ queryKey: ["non-channel-members", channelId, searchQuery] });
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up member changes subscription');
      supabase.removeChannel(channel);
    };
  }, [channelId, isOpen, queryClient, searchQuery]);

  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ["channel-members", channelId],
    queryFn: async () => {
      console.log('Fetching channel members...');
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
      console.log('Fetching available users...');
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
      const { data: existingMember, error: checkError } = await supabase
        .from("channel_members")
        .select("user_id")
        .eq("channel_id", channelId)
        .eq("user_id", userId)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking existing member:", checkError);
        throw checkError;
      }

      if (existingMember) {
        toast({
          title: "Membre déjà présent",
          description: "Cet utilisateur est déjà membre du canal",
          variant: "default",
        });
        return;
      }

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

      // Refresh data after adding member
      await Promise.all([
        refetchMembers(),
        refetchNonMembers(),
        queryClient.invalidateQueries({ queryKey: ["channel-members"] }),
        queryClient.invalidateQueries({ queryKey: ["non-channel-members"] })
      ]);

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
      onClose(); // Close the dialog after removing yourself
      
      // Refresh data after removing member
      await Promise.all([
        refetchMembers(),
        refetchNonMembers(),
        queryClient.invalidateQueries({ queryKey: ["channel-members"] }),
        queryClient.invalidateQueries({ queryKey: ["non-channel-members"] })
      ]);

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
            <DialogDescription>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>Pour ajouter un nouveau membre :</span>
                </div>
                <ol className="list-decimal ml-8 space-y-1 text-muted-foreground">
                  <li>Tapez le nom ou l'email de l'utilisateur dans la barre de recherche ci-dessous</li>
                  <li>Les utilisateurs disponibles apparaîtront dans la section "Utilisateurs disponibles"</li>
                  <li>Cliquez sur "Ajouter au canal" à côté de l'utilisateur souhaité</li>
                </ol>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Recherchez un utilisateur par nom ou email pour l'ajouter au canal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[50vh] rounded-md border">
            <div className="p-4 space-y-6">
              {/* Current Members Section */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
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
                          {member.email} • {member.role === 'admin' ? 'Administrateur' : 'Interprète'}
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

              {/* Available Users Section */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Utilisateurs disponibles {searchQuery && `(${nonMembers.length})`}
                </h3>
                <div className="space-y-2">
                  {searchQuery ? (
                    <>
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
                              {user.email} • {user.role === 'admin' ? 'Administrateur' : 'Interprète'}
                            </p>
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => addMember(user.user_id)}
                            className="gap-2"
                          >
                            <UserPlus className="h-4 w-4" />
                            Ajouter au canal
                          </Button>
                        </div>
                      ))}
                      {nonMembers.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          Aucun utilisateur trouvé pour "{searchQuery}"
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-2 text-muted-foreground border-2 border-dashed rounded-lg">
                      <Search className="h-8 w-8 mb-2" />
                      <p className="font-medium">Recherchez des utilisateurs à ajouter</p>
                      <p>Tapez un nom ou un email dans la barre de recherche ci-dessus pour trouver des utilisateurs à ajouter au canal</p>
                    </div>
                  )}
                </div>
              </div>
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