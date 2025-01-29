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

interface User {
  id: string;
  email: string;
  role: "admin" | "interpreter";
  first_name: string;
  last_name: string;
  active: boolean;
}

export const UserManagement = () => {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"admin" | "interpreter">("interpreter");
  const [employmentStatus, setEmploymentStatus] = useState<"salaried" | "self_employed">("salaried");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { data: users, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data: interpreterProfiles, error: interpreterError } = await supabase
        .from("interpreter_profiles")
        .select("id, first_name, last_name, email");

      if (interpreterError) throw interpreterError;

      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role, active");

      if (rolesError) throw rolesError;

      const profilesMap = new Map(
        interpreterProfiles.map(profile => [profile.id, profile])
      );

      return userRoles.map(role => {
        const profile = profilesMap.get(role.user_id);
        return {
          id: role.user_id,
          email: profile?.email || "",
          role: role.role,
          first_name: profile?.first_name || "",
          last_name: profile?.last_name || "",
          active: role.active,
        };
      });
    },
  });

  const handleAddUser = async () => {
    try {
      setIsSubmitting(true);

      // Create user in Supabase Auth
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

      // Create user role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert([{ user_id: user.id, role }]);

      if (roleError) throw roleError;

      // Send welcome email with password reset link
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
          variant: "destructive", // Changed from "warning" to "destructive"
        });
      } else {
        toast({
          title: "Utilisateur créé",
          description: "Un email a été envoyé à l'utilisateur avec les instructions de connexion.",
        });
      }

      setIsAddUserOpen(false);
      setEmail("");
      setFirstName("");
      setLastName("");
      setRole("interpreter");
      setEmploymentStatus("salaried");
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
    } catch (error) {
      console.error("Error toggling user status:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { error: profileError } = await supabase
        .from("interpreter_profiles")
        .delete()
        .eq("id", userId);

      if (profileError) throw profileError;

      toast({
        title: "Utilisateur supprimé",
        description: "L'utilisateur a été supprimé avec succès",
      });

      refetch();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'utilisateur",
        variant: "destructive",
      });
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un nouvel utilisateur</DialogTitle>
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((user) => (
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
                    onClick={() => deleteUser(user.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};