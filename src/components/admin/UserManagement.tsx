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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { InterpreterProfileForm, InterpreterFormData } from "./forms/InterpreterProfileForm";
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
  employment_status?: "salaried" | "self_employed";
  languages?: string[];
}

interface AdminFormData {
  email: string;
  first_name: string;
  last_name: string;
}

export const UserManagement = () => {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"admin" | "interpreter">("interpreter");
  const [adminFormData, setAdminFormData] = useState<AdminFormData>({
    email: "",
    first_name: "",
    last_name: "",
  });
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

      const profilesMap = new Map(
        interpreterProfiles.map(profile => [profile.id, profile])
      );

      const usersData: UserData[] = await Promise.all(
        userRoles.map(async (userRole) => {
          const profile = profilesMap.get(userRole.user_id);
          
          if (!profile) {
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
          }

          return {
            id: userRole.user_id,
            email: profile.email,
            role: userRole.role,
            first_name: profile.first_name,
            last_name: profile.last_name,
            active: userRole.active || false,
            tarif_15min: profile.tarif_15min || 0,
            employment_status: profile.employment_status,
            languages: profile.languages,
          };
        })
      );

      return usersData;
    },
  });

  const adminUsers = users?.filter(user => user.role === "admin") || [];
  const interpreterUsers = users?.filter(user => user.role === "interpreter") || [];

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

  const handleAddAdmin = async () => {
    try {
      setIsSubmitting(true);

      const { data, error } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          ...adminFormData,
          role: "admin",
        },
      });

      if (error) throw error;

      toast({
        title: "Invitation envoyée",
        description: "Un email d'invitation a été envoyé à l'administrateur",
      });

      setIsAddUserOpen(false);
      setAdminFormData({ email: "", first_name: "", last_name: "" });
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des utilisateurs</h2>
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button>Ajouter un utilisateur</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <ScrollArea className="max-h-[85vh]">
              <DialogHeader>
                <DialogTitle>Ajouter un nouvel utilisateur</DialogTitle>
                <DialogDescription>
                  Sélectionnez le type d'utilisateur à ajouter
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Type d'utilisateur</Label>
                  <Select
                    value={selectedRole}
                    onValueChange={(value: "admin" | "interpreter") => setSelectedRole(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrateur</SelectItem>
                      <SelectItem value="interpreter">Interprète</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedRole === "admin" ? (
                  <form onSubmit={(e) => { e.preventDefault(); handleAddAdmin(); }} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={adminFormData.email}
                        onChange={(e) => setAdminFormData(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="first_name">Prénom</Label>
                      <Input
                        id="first_name"
                        value={adminFormData.first_name}
                        onChange={(e) => setAdminFormData(prev => ({ ...prev, first_name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Nom</Label>
                      <Input
                        id="last_name"
                        value={adminFormData.last_name}
                        onChange={(e) => setAdminFormData(prev => ({ ...prev, last_name: e.target.value }))}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Envoi en cours..." : "Envoyer l'invitation"}
                    </Button>
                  </form>
                ) : (
                  <InterpreterProfileForm
                    isEditing={true}
                    onSubmit={handleAddUser}
                    isSubmitting={isSubmitting}
                  />
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
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
              Définissez un nouveau mot de passe pour l'interprète
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleResetPassword}
              className="w-full"
              disabled={isSubmitting || !password}
            >
              {isSubmitting ? "Mise à jour..." : "Mettre à jour"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
