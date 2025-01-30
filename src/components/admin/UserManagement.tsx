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

export const UserManagement = () => {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"admin" | "interpreter">("interpreter");
  const [employmentStatus, setEmploymentStatus] = useState<"salaried" | "self_employed">("salaried");
  const [rate15min, setRate15min] = useState<number>(0);
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
      console.log("Creating user with metadata:", {
        first_name: firstName,
        last_name: lastName,
        employment_status: employmentStatus,
      });

      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password: crypto.randomUUID(),
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            employment_status: employmentStatus,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!user) throw new Error("No user returned from signup");

      console.log("User created successfully:", user);

      const { error: roleError } = await supabase
        .from("user_roles")
        .insert([{ user_id: user.id, role }]);

      if (roleError) {
        await supabase.auth.admin.deleteUser(user.id);
        throw roleError;
      }

      // Create interpreter profile with default rate if role is interpreter
      if (role === 'interpreter') {
        const { error: profileError } = await supabase
          .from("interpreter_profiles")
          .insert([{
            id: user.id,
            first_name: firstName,
            last_name: lastName,
            email: email,
            employment_status: employmentStatus,
            tarif_15min: rate15min
          }]);

        if (profileError) {
          console.error("Error creating interpreter profile:", profileError);
        }
      }

      try {
        const { error: emailError } = await supabase.functions.invoke('send-welcome-email', {
          body: {
            email,
            firstName,
            lastName,
          },
        });

        if (emailError) {
          console.error("Error sending welcome email:", emailError);
          toast({
            title: "Attention",
            description: "L'utilisateur a été créé mais l'email de bienvenue n'a pas pu être envoyé.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Utilisateur créé",
            description: "Un email a été envoyé à l'utilisateur avec les instructions de connexion.",
          });
        }
      } catch (emailError) {
        console.error("Error invoking welcome email function:", emailError);
        toast({
          title: "Attention",
          description: "L'utilisateur a été créé mais l'email de bienvenue n'a pas pu être envoyé.",
          variant: "destructive",
        });
      }

      setIsAddUserOpen(false);
      setEmail("");
      setFirstName("");
      setLastName("");
      setRole("interpreter");
      setEmploymentStatus("salaried");
      setRate15min(0);
      refetch();
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'utilisateur: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
                Un email sera envoyé à l'utilisateur avec les instructions de connexion.
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
              <TableCell>{user.tarif_15min} €</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => toggleUserStatus(user.id, user.active)}
                  >
                    {user.active ? "Désactiver" : "Activer"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setUserToDelete(user.id);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    Supprimer
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
