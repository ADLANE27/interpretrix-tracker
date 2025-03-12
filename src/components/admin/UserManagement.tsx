
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { Search, UserCog, Users } from "lucide-react";
import { AdminCreationForm } from "./forms/AdminCreationForm";
import { InterpreterProfileForm } from "./forms/InterpreterProfileForm";
import { UserTable } from "./components/UserTable";
import { ResetPasswordDialog } from "./components/ResetPasswordDialog";
import { useUserManagement } from "./hooks/useUserManagement";
import { useUserManagementToasts } from "./hooks/useUserManagementToasts";

export const UserManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [isAddingInterpreter, setIsAddingInterpreter] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const {
    users,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    handleDeleteUser,
    queryClient,
    refetch
  } = useUserManagement();

  const { showSuccessToast, showErrorToast, showLoadingToast } = useUserManagementToasts();

  const handleAddAdmin = async (data: any) => {
    try {
      setIsAddingAdmin(true);
      const { error } = await supabase.functions.invoke('send-admin-invitation', {
        body: data,
      });
      
      if (error) throw error;

      const loadingToast = showLoadingToast(
        "Invitation en cours",
        "L'invitation est en cours d'envoi..."
      );

      await new Promise(resolve => setTimeout(resolve, 1000));
      loadingToast.dismiss();
      
      showSuccessToast(
        "Invitation envoyée",
        "Un email d'invitation a été envoyé à l'administrateur"
      );

      setIsAddAdminOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error: any) {
      showErrorToast("Impossible d'ajouter l'administrateur", error);
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const handleAddInterpreter = async (data: any) => {
    try {
      setIsAddingInterpreter(true);
      console.log('Creating interpreter with data:', data);

      // Validate required fields
      if (!data.employment_status) {
        throw new Error("Le statut professionnel est requis");
      }
      if (!data.languages || data.languages.length === 0) {
        throw new Error("Au moins une paire de langues est requise");
      }
      if (typeof data.tarif_15min !== 'number' || data.tarif_15min < 0) {
        throw new Error("Le tarif pour 15 minutes doit être un nombre positif");
      }
      if (typeof data.tarif_5min !== 'number' || data.tarif_5min < 0) {
        throw new Error("Le tarif pour 5 minutes doit être un nombre positif");
      }

      const { data: response, error } = await supabase.functions.invoke('send-invitation-email', {
        body: data,
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (!response?.success) {
        console.error('Invalid response:', response);
        throw new Error(response?.message || "Erreur lors de la création de l'interprète");
      }

      const loadingToast = showLoadingToast(
        "Invitation en cours",
        "L'invitation est en cours d'envoi..."
      );

      await new Promise(resolve => setTimeout(resolve, 1000));
      loadingToast.dismiss();

      showSuccessToast(
        "Invitation envoyée",
        "Un email d'invitation a été envoyé à l'interprète"
      );

      setIsAddUserOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error: any) {
      console.error('Error creating interpreter:', error);
      showErrorToast(
        "Impossible d'ajouter l'interprète",
        error.message || "Une erreur est survenue lors de la création"
      );
    } finally {
      setIsAddingInterpreter(false);
    }
  };

  const handleResetPassword = async (password: string) => {
    if (!selectedUserId) {
      showErrorToast("Erreur", new Error("Aucun utilisateur sélectionné"));
      return;
    }

    try {
      setIsResettingPassword(true);
      
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { 
          userId: selectedUserId,
          password: password,
        }
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.message || 'Échec de la réinitialisation du mot de passe');
      }

      const loadingToast = showLoadingToast(
        "Réinitialisation en cours",
        "Le mot de passe est en cours de réinitialisation..."
      );

      await new Promise(resolve => setTimeout(resolve, 1000));
      loadingToast.dismiss();

      showSuccessToast(
        "Mot de passe réinitialisé",
        "Le mot de passe a été réinitialisé avec succès"
      );

      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsResetPasswordOpen(false);
      setSelectedUserId(null);

    } catch (error: any) {
      showErrorToast("Échec de la réinitialisation", error);
    } finally {
      setIsResettingPassword(false);
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
                onSubmit={handleAddAdmin}
                isSubmitting={isAddingAdmin}
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
                  onSubmit={handleAddInterpreter}
                  isSubmitting={isAddingInterpreter}
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
            users={users.admins} 
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
            users={users.interpreters}
            onDelete={handleDeleteUser}
            onResetPassword={(id) => {
              setSelectedUserId(id);
              setIsResetPasswordOpen(true);
            }}
          />
        </div>
      </div>

      <ResetPasswordDialog
        isOpen={isResetPasswordOpen}
        onOpenChange={setIsResetPasswordOpen}
        onSubmit={handleResetPassword}
        isSubmitting={isResettingPassword}
        userData={selectedUserId ? {
          email: users.admins.concat(users.interpreters).find(u => u.id === selectedUserId)?.email || '',
          first_name: users.admins.concat(users.interpreters).find(u => u.id === selectedUserId)?.first_name || '',
          role: users.admins.concat(users.interpreters).find(u => u.id === selectedUserId)?.role as 'admin' | 'interpreter' || 'interpreter',
          id: selectedUserId
        } : undefined}
      />
    </div>
  );
};
