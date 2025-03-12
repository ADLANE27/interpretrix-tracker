
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
import { useToast } from "@/hooks/use-toast";
import { Profile } from "@/types/profile";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import { useProfileUpdate } from "@/hooks/useProfileUpdate";

interface UserTableProps {
  users: UserData[];
  onDelete: (id: string) => void;
  onResetPassword: (id: string, password: string) => void;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
}

export const UserTable = ({ 
  users, 
  onDelete, 
  onResetPassword,
  isSubmitting,
  setIsSubmitting 
}: UserTableProps) => {
  const [isEditingInterpreter, setIsEditingInterpreter] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const { updateProfile } = useProfileUpdate();
  const { toast } = useToast();

  const handleEditInterpreter = (user: UserData) => {
    setSelectedUser(user);
    setIsEditingInterpreter(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditingInterpreter(false);
    setSelectedUser(null);
  };

  const handleCloseResetDialog = () => {
    setIsResetPasswordOpen(false);
    setSelectedUser(null);
  };

  const handleUpdateProfile = async (data: Partial<Profile>) => {
    if (!selectedUser) return;
    
    const { success } = await updateProfile(selectedUser.id, data);
    if (success) {
      handleCloseEditDialog();
    }
  };

  const handleSendPasswordReset = async (user: UserData) => {
    try {
      setIsSubmitting(true);
      
      toast({
        title: "Envoi en cours",
        description: "Envoi de l'email de réinitialisation...",
      });

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
      console.error('Error sending password reset:', error);
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

      <Dialog 
        open={isEditingInterpreter} 
        onOpenChange={(open) => {
          if (!open) {
            handleCloseEditDialog();
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Modifier le profil de l'interprète</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[85vh] px-1">
            {selectedUser && (
              <InterpreterProfileForm
                isEditing={true}
                initialData={selectedUser}
                onSubmit={handleUpdateProfile}
                isSubmitting={isSubmitting}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ResetPasswordDialog
        isOpen={isResetPasswordOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseResetDialog();
          }
        }}
        onSubmit={async (password) => {
          if (!selectedUser?.id) return;
          await onResetPassword(selectedUser.id, password);
          handleCloseResetDialog();
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
