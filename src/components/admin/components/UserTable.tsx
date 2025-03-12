
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { UserData } from "../types/user-management";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Profile } from "@/types/profile";
import { useInterpreterProfileUpdate } from "../hooks/useInterpreterProfileUpdate";
import { UserRow } from "./table/UserRow";
import { InterpreterEditDialog } from "./dialogs/InterpreterEditDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";

interface UserTableProps {
  users: UserData[];
  onDelete: (id: string) => void;
  onResetPassword: (id: string, password: string) => void;
}

export const UserTable = ({ users, onDelete, onResetPassword }: UserTableProps) => {
  const [isEditingInterpreter, setIsEditingInterpreter] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const { updateProfile, isSubmitting, setIsSubmitting } = useInterpreterProfileUpdate();

  const handleEditInterpreter = (user: UserData) => {
    const fullUserData = users.find(u => u.id === user.id);
    setSelectedUser(fullUserData || user);
    setIsEditingInterpreter(true);
  };

  const handleUpdateProfile = async (data: Partial<Profile>) => {
    if (!selectedUser) return;
    
    const success = await updateProfile({
      id: selectedUser.id,
      ...selectedUser,
      ...data
    });

    if (success) {
      setIsEditingInterpreter(false);
      setSelectedUser(null);
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
            <UserRow
              key={user.id}
              user={user}
              onEdit={handleEditInterpreter}
              onResetPasswordClick={(user) => {
                setSelectedUser(user);
                setIsResetPasswordOpen(true);
              }}
              onSendPasswordReset={handleSendPasswordReset}
              onDelete={onDelete}
              isSubmitting={isSubmitting}
            />
          ))}
        </TableBody>
      </Table>

      <InterpreterEditDialog
        isOpen={isEditingInterpreter}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUser(null);
          }
          setIsEditingInterpreter(open);
        }}
        selectedUser={selectedUser}
        onSubmit={handleUpdateProfile}
        isSubmitting={isSubmitting}
      />

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
