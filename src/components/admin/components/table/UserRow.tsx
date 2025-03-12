import { TableCell, TableRow } from "@/components/ui/table";
import { UserData } from "../../types/user-management";
import { UserActions } from "./UserActions";
import { memo, useState } from "react";
import { useInterpreterProfileUpdate } from "../../hooks/useInterpreterProfileUpdate";
import { InterpreterEditDialog } from "../dialogs/InterpreterEditDialog";
import { Profile } from "@/types/profile";

interface UserRowProps {
  user: UserData;
  onEdit: (user: UserData) => void;
  onResetPasswordClick: (user: UserData) => void;
  onSendPasswordReset: (user: UserData) => void;
  onDelete: (id: string) => void;
  isSubmitting: boolean;
}

export const UserRow = memo(({
  user,
  onEdit,
  onResetPasswordClick,
  onSendPasswordReset,
  onDelete,
  isSubmitting
}: UserRowProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { updateProfile, isSubmitting: interpreterIsSubmitting } = useInterpreterProfileUpdate();

  const handleProfileUpdate = async (data: Partial<Profile>) => {
    const success = await updateProfile({
      ...data,
      id: user.id,
      languages: data.languages || []
    });
    
    if (success) {
      setIsDialogOpen(false);
    }
  };

  return (
    <>
      <TableRow>
        <TableCell>
          {user.first_name} {user.last_name}
        </TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>{user.active ? "Actif" : "Inactif"}</TableCell>
        <TableCell className="text-right">
          <UserActions
            user={user}
            onEdit={onEdit}
            onResetPasswordClick={onResetPasswordClick}
            onSendPasswordReset={onSendPasswordReset}
            onDelete={onDelete}
            isSubmitting={isSubmitting}
          />
        </TableCell>
      </TableRow>

      <InterpreterEditDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedUser={user}
        onSubmit={handleProfileUpdate}
        isSubmitting={isSubmitting || interpreterIsSubmitting}
      />
    </>
  );
});

UserRow.displayName = 'UserRow';
