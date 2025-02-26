import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Trash2, Key, UserCog, Users } from "lucide-react";
import { AdminCreationForm } from "./forms/AdminCreationForm";
import { InterpreterProfileForm } from "./forms/InterpreterProfileForm";

interface UserData {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  active: boolean;
}

interface UsersData {
  admins: UserData[];
  interpreters: UserData[];
}

const UserTable = ({ users, onDelete, onResetPassword }: { 
  users: UserData[], 
  onDelete: (id: string) => void,
  onResetPassword: (id: string) => void 
}) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Nom</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Statut</TableHead>
        <TableHead>Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {users.length === 0 ? (
        <TableRow>
          <TableCell colSpan={4} className="text-center text-muted-foreground">
            Aucun utilisateur trouvé
          </TableCell>
        </TableRow>
      ) : (
        users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">
              {user.first_name} {user.last_name}
            </TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                user.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {user.active ? 'Actif' : 'Inactif'}
              </span>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onResetPassword(user.id)}
                >
                  <Key className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => onDelete(user.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))
      )}
    </TableBody>
  </Table>
);

export const UserManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { data: users = { admins: [], interpreters: [] }, refetch, isLoading, error } = useQuery<UsersData>({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        // Get all user roles first
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('*');

        if (rolesError) throw rolesError;

        // Get interpreter users
        const { data: interpreterData, error: interpreterError } = await supabase
          .from('interpreter_profiles')
          .select('*');

        if (interpreterError) throw interpreterError;

        // Map user roles to a lookup object
        const roleMap = (userRoles || []).reduce((acc: Record<string, { role: string, active: boolean }>, role) => {
          acc[role.user_id] = { role: role.role, active: role.active };
          return acc;
        }, {});

        // Get admin users from auth.users based on user_roles
        const adminUserIds = userRoles
          ?.filter(role => role.role === 'admin')
          .map(role => role.user_id) || [];

        // Get admin user details from auth.users
        const { data: adminData, error: adminError } = await supabase.auth.admin.listUsers();
        
        if (adminError) throw adminError;

        // Filter and format admin data
        const admins = adminData?.users
          .filter(user => adminUserIds.includes(user.id))
          .map(user => ({
            id: user.id,
            email: user.email,
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            role: 'admin',
            created_at: user.created_at,
            active: roleMap[user.id]?.active ?? false
          })) || [];

        // Format interpreter data
        const interpreters = (interpreterData || []).map(interpreter => ({
          id: interpreter.id,
          email: interpreter.email,
          first_name: interpreter.first_name || '',
          last_name: interpreter.last_name || '',
          role: 'interpreter',
          created_at: interpreter.created_at,
          active: roleMap[interpreter.id]?.active ?? false
        }));

        // Sort all users by creation date and return both groups
        return {
          admins: admins.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
          interpreters: interpreters.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        };
      } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
    }
  });

  const filteredUsers = {
    admins: users.admins.filter(user => {
      const searchTerm = searchQuery.toLowerCase().trim();
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      const email = user.email.toLowerCase();
      return fullName.includes(searchTerm) || email.includes(searchTerm);
    }),
    interpreters: users.interpreters.filter(user => {
      const searchTerm = searchQuery.toLowerCase().trim();
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      const email = user.email.toLowerCase();
      return fullName.includes(searchTerm) || email.includes(searchTerm);
    })
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (error) throw error;

      toast({
        title: "Utilisateur supprimé",
        description: "L'utilisateur a été supprimé avec succès",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'utilisateur: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async () => {
    try {
      setIsSubmitting(true);
      
      if (!selectedUserId || !password) {
        throw new Error("Missing user ID or password");
      }

      if (password !== confirmPassword) {
        toast({
          title: "Erreur",
          description: "Les mots de passe ne correspondent pas",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase.functions.invoke('reset-user-password', {
        body: { 
          userId: selectedUserId,
          password: password,
        },
      });

      if (error) throw error;

      toast({
        title: "Mot de passe mis à jour",
        description: "Le mot de passe a été mis à jour avec succès",
      });

      setIsResetPasswordOpen(false);
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser le mot de passe: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Erreur lors du chargement des utilisateurs. Veuillez réessayer.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <UserCog className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Gestion des utilisateurs</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                Ajouter un administrateur
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un nouvel administrateur</DialogTitle>
                <DialogDescription>
                  Un email sera envoyé à l'administrateur avec les instructions de connexion.
                </DialogDescription>
              </DialogHeader>
              <AdminCreationForm
                onSubmit={async (data) => {
                  try {
                    const { error } = await supabase.functions.invoke('send-admin-invitation', {
                      body: data,
                    });
                    if (error) throw error;
                    toast({
                      title: "Administrateur ajouté",
                      description: "Un email d'invitation a été envoyé",
                    });
                    setIsAddAdminOpen(false);
                    refetch();
                  } catch (error: any) {
                    toast({
                      title: "Erreur",
                      description: "Impossible d'ajouter l'administrateur: " + error.message,
                      variant: "destructive",
                    });
                  }
                }}
                isSubmitting={isSubmitting}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button>
                Ajouter un interprète
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <ScrollArea className="max-h-[85vh] px-1">
                <DialogHeader>
                  <DialogTitle>Ajouter un nouvel interprète</DialogTitle>
                  <DialogDescription>
                    Un email sera envoyé à l'interprète avec les instructions de connexion.
                  </DialogDescription>
                </DialogHeader>
                <InterpreterProfileForm
                  isEditing={true}
                  onSubmit={async (data) => {
                    try {
                      const { error } = await supabase.functions.invoke('send-invitation-email', {
                        body: data,
                      });
                      if (error) throw error;
                      toast({
                        title: "Interprète ajouté",
                        description: "Un email d'invitation a été envoyé",
                      });
                      setIsAddUserOpen(false);
                      refetch();
                    } catch (error: any) {
                      toast({
                        title: "Erreur",
                        description: "Impossible d'ajouter l'interprète: " + error.message,
                        variant: "destructive",
                      });
                    }
                  }}
                  isSubmitting={isSubmitting}
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un utilisateur..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="space-y-6">
        <div className="rounded-md border">
          <div className="bg-muted/50 p-4 flex items-center gap-2 border-b">
            <UserCog className="h-5 w-5" />
            <h3 className="font-semibold">Administrateurs</h3>
          </div>
          <UserTable 
            users={filteredUsers.admins} 
            onDelete={handleDeleteUser}
            onResetPassword={(id) => {
              setSelectedUserId(id);
              setIsResetPasswordOpen(true);
            }}
          />
        </div>

        <div className="rounded-md border">
          <div className="bg-muted/50 p-4 flex items-center gap-2 border-b">
            <Users className="h-5 w-5" />
            <h3 className="font-semibold">Interprètes</h3>
          </div>
          <UserTable 
            users={filteredUsers.interpreters}
            onDelete={handleDeleteUser}
            onResetPassword={(id) => {
              setSelectedUserId(id);
              setIsResetPasswordOpen(true);
            }}
          />
        </div>
      </div>

      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription>
              Définissez un nouveau mot de passe pour l'utilisateur
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nouveau mot de passe</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmer le mot de passe</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button 
              className="w-full"
              onClick={handleResetPassword}
              disabled={isSubmitting || !password || !confirmPassword}
            >
              {isSubmitting ? "Mise à jour..." : "Mettre à jour"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
