import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock, Calendar, Trash2 } from "lucide-react";
import { Mission } from "@/types/mission";
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

export interface MissionListProps {
  missions: Mission[];
  onDelete: (missionId: string) => Promise<void>;
  onMissionResponse?: (missionId: string, accept: boolean) => Promise<void>;
}

export const MissionList = ({ missions, onDelete, onMissionResponse }: MissionListProps) => {
  const [missionToDelete, setMissionToDelete] = useState<string | null>(null);

  const handleDeleteClick = (missionId: string) => {
    setMissionToDelete(missionId);
  };

  const handleDeleteConfirm = async () => {
    if (missionToDelete) {
      await onDelete(missionToDelete);
      setMissionToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      {missions.map((mission) => (
        <Card key={mission.id} className="p-4">
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
                  {mission.creator_email && (
                    <Badge variant="outline">
                      Créée par : {mission.creator_first_name} {mission.creator_last_name}
                    </Badge>
                  )}
                </div>
                
                <div className="text-sm text-gray-600">
                  {mission.mission_type === 'immediate' ? (
                    <>
                      <p>Date : {format(new Date(mission.created_at), "EEEE d MMMM yyyy", { locale: fr })}</p>
                      <p>Langues : {mission.source_language} → {mission.target_language}</p>
                      <p>Durée : {mission.estimated_duration} minutes</p>
                    </>
                  ) : mission.scheduled_start_time && (
                    <div className="space-y-1">
                      <p className="text-blue-600">
                        Début : {format(new Date(mission.scheduled_start_time), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                      {mission.scheduled_end_time && (
                        <p className="text-blue-600">
                          Fin : {format(new Date(mission.scheduled_end_time), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                        </p>
                      )}
                      <p>Langues : {mission.source_language} → {mission.target_language}</p>
                      <p>Durée : {mission.estimated_duration} minutes</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-2">
                  <Badge variant="default">
                    {mission.status === 'awaiting_acceptance' ? 'En attente' :
                     mission.status === 'accepted' ? 'Acceptée' :
                     mission.status === 'declined' ? 'Refusée' :
                     mission.status === 'cancelled' ? 'Annulée' :
                     mission.status}
                  </Badge>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteClick(mission.id)}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}

      <AlertDialog open={!!missionToDelete} onOpenChange={() => setMissionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette mission ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La mission sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-500 hover:bg-red-600">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
