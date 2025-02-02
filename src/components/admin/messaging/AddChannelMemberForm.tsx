import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "admin" | "interpreter";
}

interface AddChannelMemberFormProps {
  channelId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const AddChannelMemberForm = ({
  channelId,
  onSuccess,
  onCancel,
}: AddChannelMemberFormProps) => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

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
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      user.first_name.toLowerCase().includes(searchTerm) ||
      user.last_name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (selectedUsers.length > 0) {
        const { error: membersError } = await supabase
          .from("channel_members")
          .insert(
            selectedUsers.map(userId => ({
              channel_id: channelId,
              user_id: userId,
              added_by: user.id,
            }))
          );

        if (membersError) throw membersError;
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error adding members:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Ajouter des membres</Label>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <ScrollArea className="h-[200px] border rounded-md p-4">
          <div className="space-y-2">
            {filteredUsers.map((user) => (
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
            {filteredUsers.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                Aucun utilisateur trouvé
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Ajout..." : "Ajouter"}
        </Button>
      </div>
    </form>
  );
};