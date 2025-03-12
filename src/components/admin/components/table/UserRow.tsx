import { TableCell, TableRow } from "@/components/ui/table";
import { UserData } from "../../types/user-management";
import { UserActions } from "./UserActions";
import { memo } from "react";
import { useState } from "react";
import { useInterpreterProfileUpdate } from "@/hooks/interpreter-profile-update";
import { InterpreterEditDialog } from "@/components/dialogs/interpreter-edit-dialog";

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
    await updateProfile({
      ...data,
      id: user.id,
      languages: data.languages || [],  // Ensure languages is always an array
    });
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
        selectedUser={{
          ...user,
          languages: user.languages || [],  // Ensure languages is always an array when passing to dialog
        }}
        onSubmit={handleProfileUpdate}
        isSubmitting={isSubmitting || interpreterIsSubmitting}
      />
    </>
  );
});

UserRow.displayName = 'UserRow';
