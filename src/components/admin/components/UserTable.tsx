
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Pencil, MoreHorizontal, Key, Trash, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { UserData } from "../types/user-management";
import { InterpreterProfileForm } from "@/components/admin/forms/InterpreterProfileForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Profile } from "@/types/profile";
import { useNavigate } from "react-router-dom";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface UserTableProps {
  users: UserData[];
  onDelete: (id: string) => void;
  onResetPassword: (id: string, password: string) => void;
}

export const UserTable = ({ users, onDelete, onResetPassword }: UserTableProps) => {
  const [isEditingInterpreter, setIsEditingInterpreter] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);

  const handleEditInterpreter = (user: UserData) => {
    setSelectedUser(user);
    setIsEditingInterpreter(true);
  };

  const handleUpdateProfile = async (data: Partial<Profile>) => {
    if (!selectedUser) return;
    
    try {
      setIsSubmitting(true);
      
      // Create a clean profile object without extra fields
      const profileData = {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        languages: data.languages?.map(lang => `${lang.source}→${lang.target}`),
        employment_status: data.employment_status,
        status: data.status,
        phone_number: data.phone_number,
        address: data.address,
        birth_country: data.birth_country,
        nationality: data.nationality,
        siret_number: data.siret_number,
        vat_number: data.vat_number,
        specializations: data.specializations,
        landline_phone: data.landline_phone,
        tarif_15min: data.tarif_15min,
        tarif_5min: data.tarif_5min,
        booth_number: data.booth_number,
        professional_phone: data.professional_phone,
        private_phone: data.private_phone,
        work_hours: data.work_hours
      };
      
      const { error } = await supabase.functions.invoke('update-interpreter-profile', {
        body: {
          id: selectedUser.id,
          ...profileData
        }
      });

      if (error) throw error;

      // Don't close the dialog immediately
      toast({
        title: "Profil mis à jour",
        description: "Le profil a été mis à jour avec succès. La page va se recharger...",
      });

      // Give time for the toast to be visible
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendPasswordReset = async (user: UserData) => {
    try {
      setIsSubmitting(true);
      const { error } = await supabase.functions.invoke('send-password-reset-email', {
        body: { 
          user_id: user.id,
          email: user.email,
          first_name: user.first_name,
          role: user.role
        }
      });

      if (error) throw error;

      toast({
        title: "Email envoyé",
        description: "L'email de réinitialisation du mot de passe a été envoyé",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'email: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (users.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Aucun utilisateur trouvé
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                {user.first_name} {user.last_name}
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.active ? "Actif" : "Inactif"}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {user.role === 'interpreter' && (
                      <DropdownMenuItem onClick={() => handleEditInterpreter(user)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Modifier
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => {
                      setSelectedUser(user);
                      setIsResetPasswordOpen(true);
                    }}>
                      <Key className="mr-2 h-4 w-4" />
                      Réinitialiser le mot de passe
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleSendPasswordReset(user)}
                      disabled={isSubmitting}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Envoyer un lien de réinitialisation
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(user.id)}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isEditingInterpreter} onOpenChange={setIsEditingInterpreter}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Modifier le profil de l'interprète</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[85vh] px-1">
            {selectedUser && (
              <>
                {isSubmitting && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                    <LoadingSpinner size="lg" text="Mise à jour du profil..." />
                  </div>
                )}
                <InterpreterProfileForm
                  isEditing={true}
                  initialData={selectedUser}
                  onSubmit={handleUpdateProfile}
                  isSubmitting={isSubmitting}
                />
              </>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ResetPasswordDialog
        isOpen={isResetPasswordOpen}
        onOpenChange={setIsResetPasswordOpen}
        onSubmit={async (password) => {
          await onResetPassword(selectedUser?.id || '', password);
          setIsResetPasswordOpen(false);
        }}
        isSubmitting={isSubmitting}
        userData={selectedUser ? {
          email: selectedUser.email || '',
          first_name: selectedUser.first_name || '',
          role: selectedUser.role as 'admin' | 'interpreter',
          id: selectedUser.id
        } : undefined}
      />
    </>
  );
};
