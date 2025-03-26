
import { Badge } from "@/components/ui/badge";

interface MissionStatusProps {
  status: string;
  assignedInterpreterId: string | null;
  currentUserId: string | null;
}

export const getMissionStatusDisplay = (status: string) => {
  switch (status) {
    case 'accepted':
      return { label: 'Acceptée', variant: 'default' as const };
    case 'declined':
      return { label: 'Déclinée', variant: 'secondary' as const };
    case 'awaiting_acceptance':
      return { label: 'En attente d\'acceptation', variant: 'secondary' as const };
    case 'in_progress':
      return { label: 'En cours', variant: 'default' as const };
    case 'completed':
      return { label: 'Terminée', variant: 'outline' as const };
    case 'cancelled':
      return { label: 'Annulée', variant: 'destructive' as const };
    default:
      return { label: status, variant: 'secondary' as const };
  }
};

export const MissionStatus = ({ status, assignedInterpreterId, currentUserId }: MissionStatusProps) => {
  const statusDisplay = getMissionStatusDisplay(status);
  
  const isAssignedToCurrentUser = assignedInterpreterId === currentUserId;
  
  return (
    <Badge 
      variant={statusDisplay.variant}
      className={`mt-2 ${status === 'accepted' && isAssignedToCurrentUser ? 'bg-green-100 text-green-800' : ''}`}
    >
      {isAssignedToCurrentUser && status === 'accepted' 
        ? 'Acceptée par vous' 
        : (status === 'accepted' && !isAssignedToCurrentUser 
            ? 'Acceptée par un autre interprète' 
            : statusDisplay.label)}
    </Badge>
  );
};
