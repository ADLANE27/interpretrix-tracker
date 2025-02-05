
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserSearch } from "./channel-members/UserSearch";
import { MemberList } from "./channel-members/MemberList";
import { AvailableUsersList } from "./channel-members/AvailableUsersList";
import { RemoveMemberDialog } from "./channel-members/RemoveMemberDialog";

interface ChannelMembersDialogProps {
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

export const ChannelMembersDialog = ({
  isOpen,
  onClose,
  channelId,
}: ChannelMembersDialogProps) => {
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

  const { data: availableUsers = [] } = useQuery({
    queryKey: ["available-users", searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_available_channel_users', {
        channel_id: channelId,
        search_query: searchQuery
      });

      if (error) throw error;
      return data;
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

      setUserToRemove(null);
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Gérer les membres du canal</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <UserSearch value={searchQuery} onChange={setSearchQuery} />
            <ScrollArea className="h-[50vh]">
              <div className="space-y-4">
                <MemberList 
                  members={members} 
                  onRemoveMember={setUserToRemove} 
                />
                {searchQuery && (
                  <AvailableUsersList 
                    users={availableUsers}
                    onAddUser={addMember}
                  />
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <RemoveMemberDialog
        member={userToRemove}
        onClose={() => setUserToRemove(null)}
        onConfirm={removeMember}
      />
    </>
  );
};
