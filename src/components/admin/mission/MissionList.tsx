import { format } from "date-fns";
import { fr } from 'date-fns/locale';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Mission {
  id: string;
  source_language: string;
  target_language: string;
  estimated_duration: number;
  status: string;
  created_at: string;
  assigned_interpreter_id?: string;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  mission_type: 'immediate' | 'scheduled';
  interpreter_profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url: string | null;
    status: string;
  };
}

interface MissionListProps {
  missions: Mission[];
  onDelete: (missionId: string) => Promise<void>;
}

export const MissionList = ({ missions, onDelete }: MissionListProps) => {
  const calculateDuration = (mission: Mission) => {
    if (mission.mission_type === 'scheduled' && mission.scheduled_start_time && mission.scheduled_end_time) {
      const durationInMinutes = Math.round(
        (new Date(mission.scheduled_end_time).getTime() - new Date(mission.scheduled_start_time).getTime()) / 1000 / 60
      );
      return `${durationInMinutes} minutes`;
    }
    return `${mission.estimated_duration} minutes`;
  };

  if (missions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucune mission trouvée
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {missions.map((mission) => (
        <Card key={mission.id} className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                {mission.mission_type === 'scheduled' ? (
                  <Calendar className="h-4 w-4 text-blue-500" />
                ) : (
                  <Clock className="h-4 w-4 text-green-500" />
                )}
                <Badge variant={mission.mission_type === 'scheduled' ? 'secondary' : 'default'}>
                  {mission.mission_type === 'scheduled' ? 'Programmée' : 'Immédiate'}
                </Badge>
                {mission.status === 'awaiting_acceptance' && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    En attente d'acceptation
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-gray-600 mt-2">
                {mission.source_language} → {mission.target_language}
              </p>
              
              {mission.mission_type === 'scheduled' && mission.scheduled_start_time && mission.scheduled_end_time && (
                <p className="text-sm text-gray-600">
                  Le {format(new Date(mission.scheduled_start_time), "dd/MM/yyyy", { locale: fr })} {" "}
                  de {format(new Date(mission.scheduled_start_time), "HH:mm")} {" "}
                  à {format(new Date(mission.scheduled_end_time), "HH:mm")} {" "}
                  <span className="ml-1">({calculateDuration(mission)})</span>
                </p>
              )}
              
              {mission.mission_type === 'immediate' && (
                <p className="text-sm text-gray-600">
                  Durée: {calculateDuration(mission)}
                </p>
              )}

              {mission.interpreter_profiles && (
                <div className="mt-2 flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={mission.interpreter_profiles.profile_picture_url || undefined} />
                    <AvatarFallback>
                      {mission.interpreter_profiles.first_name[0]}
                      {mission.interpreter_profiles.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-600">
                    Mission acceptée par {mission.interpreter_profiles.first_name} {mission.interpreter_profiles.last_name}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">
                {format(new Date(mission.created_at), "d MMMM yyyy", { locale: fr })}
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
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
                    <AlertDialogAction 
                      onClick={() => onDelete(mission.id)}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};