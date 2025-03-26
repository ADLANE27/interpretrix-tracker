
import { CheckSquare, XSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mission } from "@/types/mission";
import { EditMissionDialog } from "@/components/admin/mission/EditMissionDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface MissionActionsProps {
  mission: Mission;
  isProcessing: boolean;
  showAdminControls?: boolean;
  onMissionResponse: (missionId: string, accept: boolean) => Promise<void>;
  onDelete?: (missionId: string) => Promise<void>;
}

export const MissionActions = ({ 
  mission, 
  isProcessing, 
  showAdminControls = false, 
  onMissionResponse,
  onDelete
}: MissionActionsProps) => {
  const handleDelete = async () => {
    if (onDelete) {
      await onDelete(mission.id);
    }
  };

  return (
    <div className="flex justify-end gap-2">
      {showAdminControls && (
        <>
          <EditMissionDialog 
            mission={mission} 
            onMissionUpdated={() => onDelete?.(mission.id)}
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer la mission</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer cette mission ? Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
      {mission.status === 'awaiting_acceptance' && !isProcessing && (
        <>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => onMissionResponse(mission.id, true)}
          >
            <CheckSquare className="h-4 w-4" />
            Accepter
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => onMissionResponse(mission.id, false)}
          >
            <XSquare className="h-4 w-4" />
            Décliner
          </Button>
        </>
      )}
    </div>
  );
};
