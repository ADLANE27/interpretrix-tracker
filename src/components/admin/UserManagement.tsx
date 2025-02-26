
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
import { convertLanguagePairsToStrings } from "@/types/languages";

type EmploymentStatus = "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed" | "permanent_interpreter";
type InterpreterStatus = "available" | "unavailable" | "pause" | "busy";

interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  active: boolean;
  role: "admin";
}

interface InterpreterUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  active: boolean;
  role: "interpreter";
  tarif_15min: number;
  tarif_5min: number;
  employment_status: EmploymentStatus;
  languages: string[];
  status: InterpreterStatus;
}

type UserData = AdminUser | InterpreterUser;

// Types pour les données Supabase
interface AdminProfileWithRole {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_roles: {
    active: boolean;
    role: "admin";
  }[];
}

interface InterpreterProfileWithRole {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  languages: string[];
  tarif_15min: number;
  tarif_5min: number;
  employment_status: EmploymentStatus;
  status: string;
  user_roles: {
    active: boolean;
    role: "interpreter";
  }[];
}

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
      console.log("Fetching users data");
      
      // Récupérer les admins depuis admin_profiles et user_roles
      const { data: adminProfiles, error: adminError } = await supabase
        .from('admin_profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          user_roles!inner (
            active,
            role
          )
        `)
        .eq('user_roles.role', 'admin') as { data: AdminProfileWithRole[] | null, error: any };

      if (adminError) {
        console.error("Error fetching admin profiles:", adminError);
        throw adminError;
      }

      // Récupérer les interprètes
      const { data: interpreterProfiles, error: interpreterError } = await supabase
        .from('interpreter_profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          languages,
          tarif_15min,
          tarif_5min,
          employment_status,
          status,
          user_roles!inner (
            active,
            role
          )
        `)
        .eq('user_roles.role', 'interpreter') as { data: InterpreterProfileWithRole[] | null, error: any };

      if (interpreterError) {
        console.error("Error fetching interpreter profiles:", interpreterError);
        throw interpreterError;
      }

      const admins: AdminUser[] = (adminProfiles || []).map(profile => ({
        id: profile.id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        active: profile.user_roles[0].active,
        role: 'admin'
      }));

      const interpreters: InterpreterUser[] = (interpreterProfiles || []).map(profile => ({
        id: profile.id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        active: profile.user_roles[0].active,
        role: 'interpreter',
        languages: profile.languages || [],
        status: (profile.status || 'unavailable') as InterpreterStatus,
        tarif_15min: profile.tarif_15min || 0,
        tarif_5min: profile.tarif_5min || 0,
        employment_status: profile.employment_status
      }));

      console.log("Admins:", admins);
      console.log("Interpreters:", interpreters);

      return [...admins, ...interpreters];
    }
  });

  const adminUsers = users.filter((user): user is AdminUser => user.role === "admin");
  const interpreterUsers = users.filter((user): user is InterpreterUser => user.role === "interpreter");

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

      const languageStrings = convertLanguagePairsToStrings(formData.languages);

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

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleError) throw roleError;

      const { error: profileError } = await supabase
        .from('interpreter_profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        console.error("Error deleting interpreter profile:", profileError);
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

  const handleUpdateInterpreter = async (userId: string, formData: InterpreterFormData) => {
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

      const { error } = await supabase
        .from('interpreter_profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          employment_status: formData.employment_status,
          languages: languageStrings,
          tarif_5min: formData.tarif_5min,
          tarif_15min: formData.tarif_15min,
          address: addressJson,
          phone_number: formData.phone_number || null,
          birth_country: formData.birth_country || null,
          nationality: formData.nationality || null,
          phone_interpretation_rate: formData.phone_interpretation_rate || null,
          siret_number: formData.siret_number || null,
          vat_number: formData.vat_number || null,
          specializations: formData.specializations || [],
          landline_phone: formData.landline_phone || null
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Profil mis à jour",
        description: "Le profil de l'interprète a été mis à jour avec succès",
      });

      refetch();
    } catch (error: any) {
      console.error("Error updating interpreter:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-full px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
        <h2 className="text-2xl font-bold">Gestion des utilisateurs</h2>
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

      <div className="space-y-6 overflow-x-hidden">
        <AdminList
          admins={adminUsers}
          onToggleStatus={toggleUserStatus}
          onDeleteUser={handleDeleteUser}
          onResetPassword={(userId) => {
            setSelectedUserId(userId);
            setIsResetPasswordOpen(true);
          }}
        />

        <InterpreterList
          interpreters={interpreterUsers}
          onToggleStatus={toggleUserStatus}
          onDeleteUser={handleDeleteUser}
          onResetPassword={(userId) => {
            setSelectedUserId(userId);
            setIsResetPasswordOpen(true);
          }}
          onUpdateInterpreter={handleUpdateInterpreter}
        />
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
