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
import { AdminCreationForm } from "./forms/AdminCreationForm";
import { InterpreterProfileForm } from "./forms/InterpreterProfileForm";

interface UserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  active: boolean;
}

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

  const { data: users = [], refetch, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        // Get admin users
        const { data: adminData, error: adminError } = await supabase
          .from('admin_profiles')
          .select(`
            id,
            email,
            first_name,
            last_name,
            created_at,
            user_roles!inner (
              role,
              active
            )
          `)
          .order('created_at', { ascending: false });

        if (adminError) {
          console.error('Error fetching admins:', adminError);
          throw adminError;
        }

        // Get interpreter users
        const { data: interpreterData, error: interpreterError } = await supabase
          .from('interpreter_profiles')
          .select(`
            id,
            email,
            first_name,
            last_name,
            created_at,
            user_roles!inner (
              role,
              active
            )
          `)
          .order('created_at', { ascending: false });

        if (interpreterError) {
          console.error('Error fetching interpreters:', interpreterError);
          throw interpreterError;
        }

        // Format admin data
        const admins = (adminData || []).map((admin: any) => ({
          id: admin.id,
          email: admin.email,
          first_name: admin.first_name || '',
          last_name: admin.last_name || '',
          role: 'admin',
          created_at: admin.created_at,
          active: admin.user_roles[0]?.active ?? false
        }));

        // Format interpreter data
        const interpreters = (interpreterData || []).map((interpreter: any) => ({
          id: interpreter.id,
          email: interpreter.email,
          first_name: interpreter.first_name || '',
          last_name: interpreter.last_name || '',
          role: 'interpreter',
          created_at: interpreter.created_at,
          active: interpreter.user_roles[0]?.active ?? false
        }));

        // Sort all users by creation date
        const allUsers = [...admins, ...interpreters].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        console.log('Total users found:', allUsers.length);
        return allUsers;
      } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
    }
  });

  const filteredUsers = users.filter(user => {
    const searchTerm = searchQuery.toLowerCase().trim();
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
    return fullName.includes(searchTerm) || user.email.toLowerCase().includes(searchTerm);
  });

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

      <div className="rounded-md border">
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Chargement des utilisateurs...
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Aucun utilisateur trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.first_name} {user.last_name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="capitalize">
                    {user.role === 'admin' ? 'Administrateur' : 'Interprète'}
                  </TableCell>
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
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setIsResetPasswordOpen(true);
                        }}
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteUser(user.id)}
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
