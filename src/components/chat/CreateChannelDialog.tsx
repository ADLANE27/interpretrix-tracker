import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateChannelDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "admin" | "interpreter";
}

export const CreateChannelDialog = ({ isOpen, onClose }: CreateChannelDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"admin_only" | "internal" | "external" | "mixed">("mixed");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: users = [] } = useQuery({
    queryKey: ["users", searchQuery],
    queryFn: async () => {
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const { data: profiles, error: profilesError } = await supabase
        .from('interpreter_profiles')
        .select('id, email, first_name, last_name');

      if (profilesError) throw profilesError;

      const profilesMap = new Map(
        profiles?.map(profile => [profile.id, profile]) || []
      );

      const usersData = await Promise.all(
        userRoles.map(async (userRole) => {
          const profile = profilesMap.get(userRole.user_id);

          if (!profile && userRole.role === 'admin') {
            try {
              const response = await supabase.functions.invoke('get-user-info', {
                body: { userId: userRole.user_id }
              });

              if (response.error) throw response.error;

              const userData = response.data;
              console.log('Admin user data:', userData);

              return {
                id: userRole.user_id,
                email: userData.email || "",
                first_name: userData.first_name || "",
                last_name: userData.last_name || "",
                role: userRole.role as "admin",
              };
            } catch (error) {
              console.error('Error fetching admin info:', error);
              return null;
            }
          }

          if (profile) {
            return {
              id: userRole.user_id,
              email: profile.email,
              first_name: profile.first_name,
              last_name: profile.last_name,
              role: userRole.role as "admin" | "interpreter",
            };
          }

          return null;
        })
      );

      return usersData.filter((user): user is User => 
        user !== null && 
        (user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
         user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         user.last_name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Create the channel
      const { data: channel, error: channelError } = await supabase
        .from('chat_channels')
        .insert({
          name,
          description,
          type,
          created_by: user.id,
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Add selected members to the channel, checking for existing memberships
      if (selectedUsers.length > 0) {
        const memberInserts = selectedUsers.map(userId => ({
          channel_id: channel.id,
          user_id: userId,
        }));

        // Check for existing memberships
        const { data: existingMembers, error: existingMembersError } = await supabase
          .from('channel_members')
          .select('user_id')
          .eq('channel_id', channel.id)
          .in('user_id', selectedUsers);

        if (existingMembersError) throw existingMembersError;

        // Filter out users who are already members
        const existingMemberIds = new Set(existingMembers?.map(member => member.user_id));
        const newMembers = memberInserts.filter(member => !existingMemberIds.has(member.user_id));

        if (newMembers.length > 0) {
          const { error: membersError } = await supabase
            .from('channel_members')
            .insert(newMembers);

          if (membersError) throw membersError;
        }
      }

      // Add the creator as a member if they're not already added
      const { error: creatorMemberError } = await supabase
        .from('channel_members')
        .insert({
          channel_id: channel.id,
          user_id: user.id,
        })
        .select()
        .single();

      // Ignore duplicate key error for creator
      if (creatorMemberError && !creatorMemberError.message.includes('duplicate key')) {
        throw creatorMemberError;
      }

      toast({
        title: "Canal créé",
        description: "Le canal de discussion a été créé avec succès",
      });

      onClose();
      setName("");
      setDescription("");
      setType("mixed");
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error creating channel:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le canal",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const formatUserName = (user: User) => {
    if (!user.first_name && !user.last_name) {
      return `${user.email} (${user.role === 'admin' ? 'Admin' : 'Interpreter'})`;
    }
    return `${user.first_name} ${user.last_name} (${user.role === 'admin' ? 'Admin' : 'Interpreter'})`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Créer un nouveau canal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du canal</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du canal"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du canal (optionnel)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type de canal</Label>
            <Select value={type} onValueChange={(value: typeof type) => setType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin_only">Administrateurs uniquement</SelectItem>
                <SelectItem value="internal">Interne</SelectItem>
                <SelectItem value="external">Externe</SelectItem>
                <SelectItem value="mixed">Mixte</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Membres</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un utilisateur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <ScrollArea className="h-[200px] border rounded-md">
              <div className="p-4 space-y-2">
                {users.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">
                        {formatUserName(user)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={selectedUsers.includes(user.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleUser(user.id)}
                    >
                      {selectedUsers.includes(user.id) ? "Sélectionné" : "Ajouter"}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              Créer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};