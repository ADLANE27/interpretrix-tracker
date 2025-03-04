import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Clock, CheckSquare, XSquare, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTimeDisplay, formatTimeString } from "@/utils/dateTimeUtils";

interface MissionCardProps {
  mission: Mission;
  currentUserId: string | null;
  isProcessing: boolean;
  onMissionResponse: (missionId: string, accept: boolean) => Promise<void>;
  onDelete?: (missionId: string) => Promise<void>;
  showAdminControls?: boolean;
}

const getMissionStatusDisplay = (status: string, assignedInterpreterId: string | null, currentUserId: string | null) => {
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

export const MissionCard = ({ 
  mission, 
  currentUserId, 
  isProcessing, 
  onMissionResponse,
  onDelete,
  showAdminControls = false 
}: MissionCardProps) => {
  const statusDisplay = getMissionStatusDisplay(
    mission.status, 
    mission.assigned_interpreter_id,
    currentUserId
  );
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('interpretation_missions')
        .delete()
        .eq('id', mission.id);

      if (error) throw error;

      toast({
        title: "Mission supprimée",
        description: "La mission a été supprimée avec succès"
      });

      if (onDelete) {
        await onDelete(mission.id);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la suppression",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="p-4">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              {mission.mission_type === 'scheduled' ? (
                <Calendar className="h-4 w-4 text-blue-500" />
              ) : (
                <Clock className="h-4 w-4 text-green-500" />
              )}
              <Badge variant={mission.mission_type === 'scheduled' ? 'secondary' : 'default'}>
                {mission.mission_type === 'scheduled' ? 'Programmée' : 'Immédiate'}
              </Badge>
            </div>
            
            <div className="text-sm text-gray-600">
              {mission.mission_type === 'immediate' ? (
                <>
                  <p>Date: {formatDateDisplay(mission.created_at)}</p>
                  <p>Langues: {mission.source_language} → {mission.target_language}</p>
                  <p>Durée: {mission.estimated_duration} minutes</p>
                </>
              ) : mission.scheduled_start_time && (
                <div className="space-y-1">
                  <p className="text-blue-600">
                    Début: {formatDateTimeDisplay(mission.scheduled_start_time)}
                  </p>
                  {mission.scheduled_end_time && (
                    <p className="text-blue-600">
                      Fin: {formatDateTimeDisplay(mission.scheduled_end_time)}
                    </p>
                  )}
                  <p>Langues: {mission.source_language} → {mission.target_language}</p>
                  <p>Durée: {mission.estimated_duration} minutes</p>
                </div>
              )}
            </div>
            <Badge 
              variant={statusDisplay.variant}
              className={`mt-2 ${mission.status === 'accepted' && mission.assigned_interpreter_id === currentUserId ? 'bg-green-100 text-green-800' : ''}`}
            >
              {statusDisplay.label}
            </Badge>
          </div>
        </div>
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
      </div>
    </Card>
  );
};
