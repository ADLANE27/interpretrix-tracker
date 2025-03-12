
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Pencil, MoreHorizontal, Key, Trash, Mail } from "lucide-react";
import { UserData } from "../../types/user-management";

interface UserActionsProps {
  user: UserData;
  onEdit: (user: UserData) => void;
  onResetPasswordClick: (user: UserData) => void;
  onSendPasswordReset: (user: UserData) => void;
  onDelete: (id: string) => void;
  isSubmitting: boolean;
}

export const UserActions = ({
  user,
  onEdit,
  onResetPasswordClick,
  onSendPasswordReset,
  onDelete,
  isSubmitting
}: UserActionsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {user.role === 'interpreter' && (
          <DropdownMenuItem onClick={() => onEdit(user)}>
            <Pencil className="mr-2 h-4 w-4" />
            Modifier
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onResetPasswordClick(user)}>
          <Key className="mr-2 h-4 w-4" />
          Réinitialiser le mot de passe
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onSendPasswordReset(user)}
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
  );
};
