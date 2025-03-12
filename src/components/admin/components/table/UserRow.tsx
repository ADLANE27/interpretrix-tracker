
import { TableCell, TableRow } from "@/components/ui/table";
import { UserData } from "../../types/user-management";
import { UserActions } from "./UserActions";
import { memo } from "react";

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
  return (
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
  );
});

UserRow.displayName = 'UserRow';
