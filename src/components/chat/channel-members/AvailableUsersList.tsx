
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchAvailableUsers = async () => {
      try {
        const { data, error } = await supabase.rpc('get_available_channel_users', {
          channel_id: channelId,
          search_query: searchQuery
        });

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
  }, [channelId, searchQuery]);

  const handleAddUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('channel_members')
        .insert({
          channel_id: channelId,
          user_id: userId,
        });

      if (error) throw error;

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

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un utilisateur..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground">Chargement...</div>
      ) : !users.length ? (
        <div className="text-center text-muted-foreground">
          {searchQuery ? "Aucun utilisateur trouvé" : "Aucun utilisateur disponible"}
        </div>
      ) : (
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
      )}
    </div>
  );
};
