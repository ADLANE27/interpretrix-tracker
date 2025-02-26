
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AvailableUser {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'interpreter';
}

interface AvailableUsersListProps {
  channelId: string;
}

export const AvailableUsersList = ({ channelId }: AvailableUsersListProps) => {
  const [users, setUsers] = useState<AvailableUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvailableUsers = async () => {
      try {
        // Récupérer les utilisateurs qui ne sont pas déjà membres du canal
        const { data, error } = await supabase
          .rpc('get_available_channel_users', { channel_id: channelId });

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error('Error fetching available users:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les utilisateurs disponibles",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableUsers();
  }, [channelId]);

  const handleAddUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('channel_members')
        .insert({
          channel_id: channelId,
          user_id: userId,
        });

      if (error) throw error;

      // Retirer l'utilisateur de la liste des disponibles
      setUsers(prev => prev.filter(user => user.user_id !== userId));
      
      toast({
        title: "Succès",
        description: "Utilisateur ajouté au canal"
      });
    } catch (error) {
      console.error('Error adding user to channel:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'utilisateur au canal",
        variant: "destructive"
      });
    }
  };

  if (!users.length) return null;

  return (
    <div>
      <h3 className="font-medium mb-2">Utilisateurs disponibles</h3>
      <div className="space-y-2">
        {users.map(user => (
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
              onClick={() => handleAddUser(user.user_id)}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
