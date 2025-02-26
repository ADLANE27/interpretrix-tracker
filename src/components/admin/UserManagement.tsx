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
import { Search, Trash2, Key, UserCog } from "lucide-react";
import { InterpreterProfileForm, InterpreterFormData } from "./forms/InterpreterProfileForm";
import { AdminCreationForm, AdminFormData } from "./forms/AdminCreationForm";
import { convertLanguagePairsToStrings } from "@/types/languages";

interface UserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  active: boolean;
  role: "admin" | "interpreter";
}

interface DbUserRole {
  active: boolean;
  role: "admin" | "interpreter";
}

interface DbProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_roles: DbUserRole[];
}

interface UserListProps {
  users: UserData[];
  onToggleStatus: (userId: string, currentActive: boolean) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onResetPassword: (userId: string) => void;
}

const UserList = ({ users, onToggleStatus, onDeleteUser, onResetPassword }: UserListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const filteredUsers = users.filter((user) => {
    const searchTerm = searchQuery.toLowerCase().trim();
    if (searchTerm === '') return true;

    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
    return (
      fullName.includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)
    );
  });

  return (
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Aucun utilisateur trouvé
              </TableCell>
            </TableRow>
          ) : (
            filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  {user.first_name} {user.last_name}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <span className="capitalize">{user.role}</span>
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-sm ${
                      user.active
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {user.active ? "Actif" : "Inactif"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => onToggleStatus(user.id, user.active)}
                    >
                      {user.active ? "Désactiver" : "Activer"}
                    </Button>
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
                      onClick={() => {
                        setUserToDelete(user.id);
                        setIsDeleteDialogOpen(true);
                      }}
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

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Êtes-vous sûr de vouloir supprimer cet utilisateur ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. L'utilisateur sera définitivement supprimé du système.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setUserToDelete(null);
                setIsDeleteDialogOpen(false);
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (userToDelete) {
                  onDeleteUser(userToDelete);
                  setIsDeleteDialogOpen(false);
                }
              }}
            >
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const UserManagement = () => {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { data: users = [], refetch } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data: adminProfiles, error: adminError } = await supabase
        .from('admin_profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          user_roles (
            active,
            role
          )
        `).order('created_at', { ascending: false }) as { data: DbProfile[] | null, error: any };

      if (adminError) {
        console.error('Error fetching admin profiles:', adminError);
        throw adminError;
      }

      const { data: interpreterProfiles, error: interpreterError } = await supabase
        .from('interpreter_profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          user_roles (
            active,
            role
          )
        `).order('created_at', { ascending: false }) as { data: DbProfile[] | null, error: any };

      if (interpreterError) {
        console.error('Error fetching interpreter profiles:', interpreterError);
        throw interpreterError;
      }

      console.log('Raw admin profiles:', adminProfiles);
      console.log('Raw interpreter profiles:', interpreterProfiles);

      const admins: UserData[] = (adminProfiles || [])
        .filter(profile => {
          console.log('Processing admin profile:', profile);
          return profile.user_roles && profile.user_roles.length > 0;
        })
        .map(profile => {
          const userData = {
            id: profile.id,
            email: profile.email,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            active: profile.user_roles[0]?.active ?? true,
            role: 'admin' as const
          };
          console.log('Mapped admin data:', userData);
          return userData;
        });

      const interpreters: UserData[] = (interpreterProfiles || [])
        .filter(profile => {
          console.log('Processing interpreter profile:', profile);
          return profile.user_roles && profile.user_roles.length > 0;
        })
        .map(profile => {
          const userData = {
            id: profile.id,
            email: profile.email,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            active: profile.user_roles[0]?.active ?? true,
            role: 'interpreter' as const
          };
          console.log('Mapped interpreter data:', userData);
          return userData;
        });

      const allUsers = [...admins, ...interpreters];
      console.log('Final all users:', allUsers);

      if (allUsers.length === 0) {
        console.warn('No users found in the database');
      }

      return allUsers;
    },
    retry: 1
  });

  const handleAddAdmin = async (data: AdminFormData) => {
    try {
      setIsSubmitting(true);
      const { error } = await supabase.functions.invoke('send-admin-invitation', {
        body: { 
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          password: data.password
        },
      });

      if (error) throw error;

      toast({
        title: "Administrateur ajouté",
        description: "Un email d'invitation a été envoyé à l'administrateur",
      });

      setIsAddAdminOpen(false);
      refetch();
    } catch (error: any) {
      console.error("Error adding admin:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'administrateur: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddUser = async (data: InterpreterFormData) => {
    try {
      setIsSubmitting(true);
      const { error } = await supabase.functions.invoke('send-invitation-email', {
        body: { 
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          password: data.password,
          employment_status: data.employment_status,
          languages: convertLanguagePairsToStrings(data.languages),
          tarif_15min: data.tarif_15min,
          tarif_5min: data.tarif_5min,
        },
      });

      if (error) throw error;

      toast({
        title: "Interprète ajouté",
        description: "Un email d'invitation a été envoyé à l'interprète",
      });

      setIsAddUserOpen(false);
      refetch();
    } catch (error: any) {
      console.error("Error adding interpreter:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'interprète: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setIsSubmitting(true);
      
      if (!selectedUserId || !password) {
        throw new Error("Missing user ID or password");
      }

      if (password !== confirmPassword) {
        setPasswordError("Les mots de passe ne correspondent pas");
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
      setPasswordError("");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser le mot de passe: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ active: !currentActive })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Statut mis à jour",
        description: `L'utilisateur a été ${!currentActive ? "activé" : "désactivé"}`,
      });

      refetch();
    } catch (error: any) {
      console.error("Error toggling user status:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleError) throw roleError;

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
      console.error("Error deleting user:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'utilisateur: " + error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-full px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-2">
          <UserCog className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Gestion des utilisateurs</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto whitespace-nowrap">
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
                onSubmit={handleAddAdmin}
                isSubmitting={isSubmitting}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto whitespace-nowrap">
                Ajouter un interprète
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <ScrollArea className="max-h-[85vh] px-1">
                <DialogHeader>
                  <DialogTitle>Ajouter un nouvel interprète</DialogTitle>
                  <DialogDescription>
                    Un email sera envoyé à l'interprète avec les instructions de connexion.
                  </DialogDescription>
                </DialogHeader>
                <InterpreterProfileForm
                  isEditing={true}
                  onSubmit={handleAddUser}
                  isSubmitting={isSubmitting}
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <UserList
        users={users}
        onToggleStatus={toggleUserStatus}
        onDeleteUser={handleDeleteUser}
        onResetPassword={(userId) => {
          setSelectedUserId(userId);
          setIsResetPasswordOpen(true);
        }}
      />

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
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError("");
                }}
              />
              {passwordError && (
                <p className="text-sm font-medium text-destructive">{passwordError}</p>
              )}
            </div>
            <Button 
              onClick={handleResetPassword}
              className="w-full"
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
