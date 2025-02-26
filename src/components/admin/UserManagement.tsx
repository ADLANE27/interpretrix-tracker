import { useState, useEffect } from "react";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InterpreterProfileForm, InterpreterFormData } from "./forms/InterpreterProfileForm";
import { AdminCreationForm, AdminFormData } from "./forms/AdminCreationForm";
import { AdminList } from "./AdminList";
import { InterpreterList } from "./InterpreterList";
import { convertLanguagePairsToStrings } from "@/types/languages";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

type EmploymentStatus = "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed" | "permanent_interpreter";
type InterpreterStatus = "available" | "unavailable" | "pause" | "busy";
type UserRole = "admin" | "interpreter";

interface UserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  active: boolean;
  role: UserRole;
  languages: string[];
  status: InterpreterStatus;
  tarif_15min: number;
  tarif_5min: number;
  employment_status: EmploymentStatus;
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
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log("[UserManagement] Setting up real-time subscription");
    
    const profilesChannel = supabase.channel('interpreter-profiles-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'interpreter_profiles'
        },
        (payload) => {
          console.log("[UserManagement] Received profile update:", payload);
          const updatedProfile = payload.new as any;
          
          queryClient.setQueryData(['users'], (oldData: UserData[] | undefined) => {
            if (!oldData) return oldData;
            
            return oldData.map(user => 
              user.id === updatedProfile.id
                ? { ...user, ...updatedProfile }
                : user
            );
          });
        }
      )
      .subscribe((status) => {
        console.log("[UserManagement] Profile subscription status:", status);
      });

    return () => {
      console.log("[UserManagement] Cleaning up subscription");
      supabase.removeChannel(profilesChannel);
    };
  }, [queryClient]);

  const { data: users = [], refetch, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      console.log("[UserManagement] Fetching users data");
      
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role, active");

      if (rolesError) {
        console.error("Error fetching user roles:", rolesError);
        throw rolesError;
      }

      console.log("[UserManagement] Fetched user roles:", userRoles);

      const allUsers = await Promise.all(
        userRoles.map(async (userRole) => {
          try {
            // Get interpreter profile data if it exists
            const { data: interpreterProfile, error: interpreterError } = await supabase
              .from('interpreter_profiles')
              .select('*')
              .eq('id', userRole.user_id)
              .maybeSingle();

            if (interpreterError) {
              console.error("Error fetching interpreter profile:", interpreterError);
              throw interpreterError;
            }

            // If interpreter profile exists, use that data
            if (interpreterProfile) {
              console.log("[UserManagement] Found interpreter profile:", interpreterProfile);
              return {
                id: userRole.user_id,
                email: interpreterProfile.email,
                role: userRole.role as UserRole,
                first_name: interpreterProfile.first_name,
                last_name: interpreterProfile.last_name,
                active: userRole.active || false,
                languages: interpreterProfile.languages || [],
                status: (interpreterProfile.status || 'unavailable') as InterpreterStatus,
                tarif_15min: interpreterProfile.tarif_15min || 0,
                tarif_5min: interpreterProfile.tarif_5min || 0,
                employment_status: interpreterProfile.employment_status as EmploymentStatus
              } satisfies UserData;
            }

            // If not an interpreter, get admin data from auth.users
            const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(
              userRole.user_id
            );

            if (authError) {
              console.error("Error fetching auth user:", authError);
              throw authError;
            }

            console.log("[UserManagement] Found admin user:", user);
            return {
              id: userRole.user_id,
              email: user?.email || "",
              role: userRole.role as UserRole,
              first_name: user?.user_metadata?.first_name || "",
              last_name: user?.user_metadata?.last_name || "",
              active: userRole.active || false,
              languages: [],
              status: 'unavailable' as InterpreterStatus,
              tarif_15min: 0,
              tarif_5min: 0,
              employment_status: 'salaried_aft' as EmploymentStatus
            } satisfies UserData;
          } catch (error) {
            console.error('Error fetching user info:', error);
            throw error;
          }
        })
      );

      console.log("[UserManagement] Final users data:", allUsers);
      return allUsers;
    },
    retry: 3,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <LoadingSpinner size="lg" text="Chargement des utilisateurs..." />
      </div>
    );
  }

  if (error) {
    console.error("[UserManagement] Query error:", error);
    return (
      <div className="p-4 text-red-600">
        Erreur lors du chargement des utilisateurs. Veuillez rafraîchir la page. 
        <br />
        Détail: {error instanceof Error ? error.message : "Erreur inconnue"}
      </div>
    );
  }

  const adminUsers = users.filter(user => user.role === "admin");
  const interpreterUsers = users.filter(user => user.role === "interpreter");

  const handleAddAdmin = async (formData: AdminFormData) => {
    try {
      setIsSubmitting(true);
      console.log("Creating admin user:", formData.email);

      const { data: { session }} = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No authentication token available");
      }

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: "admin",
          password: formData.password,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      toast({
        title: "Administrateur créé",
        description: "Le compte administrateur a été créé avec succès",
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

      const { data: { session }} = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No authentication token available");
      }

      const languageStrings = convertLanguagePairsToStrings(formData.languages);
      const addressJson = formData.address ? {
        street: formData.address.street,
        postal_code: formData.address.postal_code,
        city: formData.address.city,
      } : null;

      const { error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: "interpreter",
          employment_status: formData.employment_status,
          languages: languageStrings,
          address: addressJson,
          phone_number: formData.phone_number,
          birth_country: formData.birth_country,
          nationality: formData.nationality,
          phone_interpretation_rate: formData.phone_interpretation_rate,
          siret_number: formData.siret_number,
          vat_number: formData.vat_number,
          specializations: formData.specializations,
          landline_phone: formData.landline_phone,
          tarif_15min: formData.tarif_15min,
          tarif_5min: formData.tarif_5min,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) throw error;

      toast({
        title: "Interprète créé",
        description: "Le compte interprète a été créé avec succès",
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
        {isLoading ? (
          <div className="text-center py-4">Chargement des utilisateurs...</div>
        ) : (
          <>
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
          </>
        )}
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
