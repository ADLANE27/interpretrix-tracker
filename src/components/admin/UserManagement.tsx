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
import { InterpreterProfileForm, InterpreterFormData } from "./forms/InterpreterProfileForm";
import { AdminCreationForm, AdminFormData } from "./forms/AdminCreationForm";
import { AdminList } from "./AdminList";
import { InterpreterList } from "./InterpreterList";

interface UserData {
  id: string;
  email: string;
  role: "admin" | "interpreter";
  first_name: string;
  last_name: string;
  active: boolean;
  tarif_15min: number;
  employment_status?: "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed";
  languages?: string[];
  status?: string;
}

export const UserManagement = () => {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { data: users, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      const { data: interpreterProfiles, error: interpreterError } = await supabase
        .from("interpreter_profiles")
        .select("*");

      if (interpreterError) throw interpreterError;

      const userRolesMap = new Map(
        userRoles.map(role => [role.user_id, role])
      );

      const interpretersWithStatus = interpreterProfiles.map(profile => {
        const userRole = userRolesMap.get(profile.id);
        return {
          ...profile,
          active: userRole?.active ?? false,
          role: userRole?.role ?? 'interpreter'
        };
      });

      const usersData: UserData[] = await Promise.all(
        userRoles
          .filter(role => role.role === 'admin')
          .map(async (userRole) => {
            const response = await supabase.functions.invoke('get-user-info', {
              body: { userId: userRole.user_id }
            });
            
            if (response.error) {
              console.error('Error fetching user info:', response.error);
              return {
                id: userRole.user_id,
                email: "",
                role: userRole.role,
                first_name: "",
                last_name: "",
                active: userRole.active || false,
                tarif_15min: 0,
              };
            }

            const userData = response.data;
            return {
              id: userRole.user_id,
              email: userData.email || "",
              role: userRole.role,
              first_name: userData.first_name || "",
              last_name: userData.last_name || "",
              active: userRole.active || false,
              tarif_15min: 0,
            };
          })
      );

      return [...usersData, ...interpretersWithStatus];
    },
  });

  const adminUsers = users?.filter(user => user.role === "admin") || [];
  const interpreterUsers = users?.filter(user => user.role === "interpreter") || [];

  const handleAddAdmin = async (formData: AdminFormData) => {
    try {
      setIsSubmitting(true);

      const { error } = await supabase.functions.invoke('send-admin-invitation', {
        body: formData,
      });

      if (error) throw error;

      toast({
        title: "Invitation envoyée",
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

  const handleAddUser = async (formData: InterpreterFormData) => {
    try {
      setIsSubmitting(true);

      const languageStrings = formData.languages.map(
        (pair) => `${pair.source} → ${pair.target}`
      );

      const addressJson = formData.address ? {
        street: formData.address.street,
        postal_code: formData.address.postal_code,
        city: formData.address.city,
      } : null;

      const { data, error } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          ...formData,
          role: "interpreter",
          languages: languageStrings,
          address: addressJson,
        },
      });

      if (error) throw error;

      toast({
        title: "Invitation envoyée",
        description: "Un email d'invitation a été envoyé à l'utilisateur",
      });

      setIsAddUserOpen(false);
      refetch();
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'utilisateur: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async (formData: InterpreterFormData) => {
    if (!selectedUser) return;

    try {
      setIsSubmitting(true);

      const { data: profile, error: profileCheckError } = await supabase
        .from("interpreter_profiles")
        .select("password_changed")
        .eq("id", selectedUser.id)
        .single();

      if (profileCheckError) throw profileCheckError;

      if (!profile.password_changed) {
        toast({
          title: "Action impossible",
          description: "L'interprète doit d'abord se connecter et changer son mot de passe avant de pouvoir modifier son profil.",
          variant: "destructive",
        });
        return;
      }

      const languageStrings = formData.languages.map(
        (pair) => `${pair.source} → ${pair.target}`
      );

      const addressJson = formData.address ? {
        street: formData.address.street,
        postal_code: formData.address.postal_code,
        city: formData.address.city,
      } : null;

      const { error: profileError } = await supabase
        .from("interpreter_profiles")
        .update({
          ...formData,
          languages: languageStrings,
          address: addressJson,
        })
        .eq("id", selectedUser.id);

      if (profileError) throw profileError;

      toast({
        title: "Profil mis à jour",
        description: "Le profil de l'interprète a été mis à jour avec succès",
      });

      setIsEditUserOpen(false);
      refetch();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleError) {
        console.error("Error deleting user roles:", roleError);
        throw roleError;
      }

      const { error: profileError } = await supabase
        .from('interpreter_profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        console.error("Error deleting interpreter profile:", profileError);
        // Don't throw here as the profile might not exist
      }

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
          newPassword: password,
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des utilisateurs</h2>
        <div className="flex gap-2">
          <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Ajouter un administrateur</Button>
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
              <Button>Ajouter un interprète</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <ScrollArea className="max-h-[85vh]">
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

      <AdminList
        admins={adminUsers}
        onToggleStatus={toggleUserStatus}
        onDeleteUser={handleDeleteUser}
      />

      <InterpreterList
        interpreters={interpreterUsers}
        onToggleStatus={toggleUserStatus}
        onDeleteUser={handleDeleteUser}
        onEditUser={(user) => {
          setSelectedUser(user);
          setIsEditUserOpen(true);
        }}
        onResetPassword={(userId) => {
          setSelectedUserId(userId);
          setIsResetPasswordOpen(true);
        }}
      />

      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <ScrollArea className="max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>Modifier le profil de l'interprète</DialogTitle>
              <DialogDescription>
                Modifiez les informations de l'interprète.
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <InterpreterProfileForm
                isEditing={true}
                onSubmit={handleEditUser}
                initialData={selectedUser}
                isSubmitting={isSubmitting}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

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
