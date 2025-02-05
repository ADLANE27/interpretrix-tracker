
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

interface Member {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'interpreter';
  joined_at: string;
}

interface RemoveMemberDialogProps {
  member: Member | null;
  onClose: () => void;
  onConfirm: (member: Member) => void;
}

export const RemoveMemberDialog = ({ member, onClose, onConfirm }: RemoveMemberDialogProps) => {
  if (!member) return null;

  return (
    <AlertDialog open={!!member} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer le retrait du membre</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir retirer {member.first_name} {member.last_name} du canal ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(member)}
            className="bg-red-600 hover:bg-red-700"
          >
            Retirer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
