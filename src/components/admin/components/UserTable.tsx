
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
import { Pencil, MoreHorizontal, Mail, Trash, Key } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { UserData } from "../types/user-management";
import { InterpreterProfileForm } from "@/components/admin/forms/InterpreterProfileForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Profile } from "@/types/profile";
import { convertLanguagePairsToStrings } from "@/types/languages";
import { ResetPasswordDialog } from "./ResetPasswordDialog";

interface UserTableProps {
  users: UserData[];
  onDelete: (id: string) => void;
}

export const UserTable = ({ users, onDelete }: UserTableProps) => {
  const [isEditingInterpreter, setIsEditingInterpreter] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<UserData | null>(null);

  const handleEditInterpreter = (user: UserData) => {
    setSelectedUser(user);
    setIsEditingInterpreter(true);
  };

  const handleUpdateProfile = async (data: Partial<Profile>) => {
    if (!selectedUser) return;
    
    try {
      setIsSubmitting(true);
      
      const transformedData = {
        ...data,
        languages: data.languages ? convertLanguagePairsToStrings(data.languages) : undefined,
      };
      
      delete (transformedData as any).active;
      
      const { error } = await supabase
        .from('interpreter_profiles')
        .update(transformedData)
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: "Profil mis à jour",
        description: "Le profil a été mis à jour. La page va se recharger...",
      });

      setIsEditingInterpreter(false);
      
      const currentTab = localStorage.getItem('adminActiveTab') || 'users';
      localStorage.setItem('adminActiveTab', currentTab);
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      console.error('Profile update error:', error);
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

  const handleOpenResetPasswordDialog = (user: UserData) => {
    setUserToResetPassword(user);
    setIsResetPasswordDialogOpen(true);
  };

  const handleCloseResetPasswordDialog = () => {
    setUserToResetPassword(null);
    setIsResetPasswordDialogOpen(false);
  };

  const handleCloseEditDialog = () => {
    const currentTab = localStorage.getItem('adminActiveTab') || 'users';
    localStorage.setItem('adminActiveTab', currentTab);
    
    setIsEditingInterpreter(false);
    
    setTimeout(() => {
      window.location.reload();
    }, 1500);
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
                    <DropdownMenuItem 
                      onClick={() => handleOpenResetPasswordDialog(user)}
                      disabled={isSubmitting}
                    >
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
          if (!open) handleCloseEditDialog();
          else setIsEditingInterpreter(true);
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

      {userToResetPassword && (
        <ResetPasswordDialog
          isOpen={isResetPasswordDialogOpen}
          onClose={handleCloseResetPasswordDialog}
          userId={userToResetPassword.id}
          userEmail={userToResetPassword.email}
          userName={`${userToResetPassword.first_name} ${userToResetPassword.last_name}`}
        />
      )}
    </>
  );
};
