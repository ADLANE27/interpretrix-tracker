import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit, Trash2, Copy } from "lucide-react";

export const UserManagement = () => {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"admin" | "interpreter">("interpreter");
  const [employmentStatus, setEmploymentStatus] = useState<"salaried" | "self_employed">("salaried");
  const [rate15min, setRate15min] = useState<number>(0);
  const [temporaryPassword, setTemporaryPassword] = useState("Bienvenue123!");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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

      const usersData = await Promise.all(
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
                active: userRole.active,
                tarif_15min: 0,
              };
            }

            const userData = response.data;
            return {
              id: userRole.user_id,
              email: userData.email,
              role: userRole.role,
              first_name: userData.first_name,
              last_name: userData.last_name,
              active: userRole.active,
              tarif_15min: 0,
            };
          }

          return {
            id: userRole.user_id,
            email: profile.email,
            role: userRole.role,
            first_name: profile.first_name,
            last_name: profile.last_name,
            active: userRole.active,
            tarif_15min: profile.tarif_15min || 0,
          };
        })
      );

      return usersData;
    },
  });

  const handleAddUser = async () => {
    try {
      setIsSubmitting(true);

      // Call the Supabase Edge Function to create user
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          firstName,
          lastName,
          role,
          password: temporaryPassword,
          employmentStatus: role === "interpreter" ? employmentStatus : undefined,
          rate15min: role === "interpreter" ? rate15min : undefined,
        },
      });

      if (error) throw error;

      toast({
        title: "Utilisateur créé",
        description: "L'utilisateur a été créé avec succès. N'oubliez pas de lui communiquer son mot de passe temporaire.",
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

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      setIsSubmitting(true);

      const { error: profileError } = await supabase
        .from("interpreter_profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          tarif_15min: rate15min,
          employment_status: employmentStatus,
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

  const openEditDialog = (user: any) => {
    setSelectedUser(user);
    setFirstName(user.first_name);
    setLastName(user.last_name);
    setEmail(user.email);
    setRole(user.role);
    setEmploymentStatus(user.employment_status || "salaried");
    setRate15min(user.tarif_15min || 0);
    setIsEditUserOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Authentication required');
      }

      console.log('Sending delete request for user:', userId);

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (error) {
        throw error;
      }

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
    } finally {
      setUserToDelete(null);
      setIsDeleteDialogOpen(false);
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

  const filteredUsers = users?.filter(user => {
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && user.active) || 
      (statusFilter === "inactive" && !user.active);
    return matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des utilisateurs</h2>
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button>Ajouter un utilisateur</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un nouvel utilisateur</DialogTitle>
              <DialogDescription>
                Un mot de passe temporaire sera généré pour l'utilisateur.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temporaryPassword">Mot de passe temporaire</Label>
                <div className="flex gap-2">
                  <Input
                    id="temporaryPassword"
                    type={showPassword ? "text" : "password"}
                    value={temporaryPassword}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Ce mot de passe devra être changé à la première connexion
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <Select value={role} onValueChange={(value: "admin" | "interpreter") => setRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interpreter">Interprète</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {role === "interpreter" && (
                <div className="space-y-2">
                  <Label htmlFor="employmentStatus">Statut professionnel</Label>
                  <Select 
                    value={employmentStatus} 
                    onValueChange={(value: "salaried" | "self_employed") => setEmploymentStatus(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salaried">Salarié</SelectItem>
                      <SelectItem value="self_employed">Auto-entrepreneur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {role === "interpreter" && (
                <div className="space-y-2">
                  <Label htmlFor="rate_15min">Tarif (15 minutes)</Label>
                  <Input
                    id="rate_15min"
                    type="number"
                    min="0"
                    step="0.01"
                    value={rate15min}
                    onChange={(e) => setRate15min(parseFloat(e.target.value))}
                  />
                </div>
              )}
              <Button 
                onClick={handleAddUser} 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Création en cours..." : "Ajouter"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="w-48">
          <Label htmlFor="roleFilter">Filtrer par rôle</Label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              <SelectItem value="admin">Administrateur</SelectItem>
              <SelectItem value="interpreter">Interprète</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Label htmlFor="statusFilter">Filtrer par statut</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="inactive">Inactif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Tarif (15 min)</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers?.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                {user.first_name} {user.last_name}
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                {user.role === "admin" ? "Administrateur" : "Interprète"}
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
              <TableCell>{user.tarif_15min || 0} €</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => toggleUserStatus(user.id, user.active)}
                  >
                    {user.active ? "Désactiver" : "Activer"}
                  </Button>
                  {user.role === "interpreter" && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditDialog(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
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
          ))}
        </TableBody>
      </Table>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le profil de l'interprète</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l'interprète, y compris son tarif.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employmentStatus">Statut professionnel</Label>
              <Select 
                value={employmentStatus} 
                onValueChange={(value: "salaried" | "self_employed") => setEmploymentStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salaried">Salarié</SelectItem>
                  <SelectItem value="self_employed">Auto-entrepreneur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate_15min">Tarif (15 minutes)</Label>
              <Input
                id="rate_15min"
                type="number"
                min="0"
                step="0.01"
                value={rate15min}
                onChange={(e) => setRate15min(parseFloat(e.target.value))}
              />
            </div>
            <Button 
              onClick={handleEditUser} 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Mise à jour..." : "Mettre à jour"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'utilisateur sera définitivement supprimé du système.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setUserToDelete(null);
              setIsDeleteDialogOpen(false);
            }}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && handleDeleteUser(userToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
