
import { Badge } from "@/components/ui/badge";

interface MissionStatusProps {
  status: string;
  assignedInterpreterId: string | null;
  currentUserId: string | null;
}

export const getMissionStatusDisplay = (status: string, assignedInterpreterId: string | null, currentUserId: string | null) => {
  if (status === 'accepted') {
    if (assignedInterpreterId === currentUserId) {
      return { label: 'Acceptée par vous', variant: 'default' as const };
    }
    return { label: 'Acceptée par un autre interprète', variant: 'secondary' as const };
  }
  
  switch (status) {
    case 'declined':
      return { label: 'Déclinée', variant: 'secondary' as const };
    case 'awaiting_acceptance':
      return { label: 'En attente d\'acceptation', variant: 'secondary' as const };
    default:
      return { label: status, variant: 'secondary' as const };
  }
};

export const MissionStatus = ({ status, assignedInterpreterId, currentUserId }: MissionStatusProps) => {
  const statusDisplay = getMissionStatusDisplay(status, assignedInterpreterId, currentUserId);
  
  return (
    <Badge 
      variant={statusDisplay.variant}
      className={`mt-2 ${status === 'accepted' && assignedInterpreterId === currentUserId ? 'bg-green-100 text-green-800' : ''}`}
    >
      {statusDisplay.label}
    </Badge>
  );
};
