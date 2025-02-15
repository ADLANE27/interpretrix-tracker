
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Button } from "@/components/ui/button";
import { Trash2, UserCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  mission_type: "immediate" | "scheduled";
  interpreter_profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url: string | null;
    status: string;
  };
  creator_email?: string;
  creator_first_name?: string;
  creator_last_name?: string;
}

interface MissionListProps {
  missions: Mission[];
  onDelete: (missionId: string) => void;
}

export const MissionList = ({ missions, onDelete }: MissionListProps) => {
  const [selectedMission, setSelectedMission] = useState<string | null>(null);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-500 text-white";
      case "declined":
        return "bg-red-500 text-white";
      case "cancelled":
        return "bg-gray-500 text-white";
      case "awaiting_acceptance":
        return "bg-yellow-500 text-white";
      default:
        return "bg-blue-500 text-white";
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case "accepted":
        return "Acceptée";
      case "declined":
        return "Refusée";
      case "cancelled":
        return "Annulée";
      case "awaiting_acceptance":
        return "En attente";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      {missions.length === 0 ? (
        <Card className="p-4">
          <p className="text-center text-muted-foreground">
            Aucune mission trouvée
          </p>
        </Card>
      ) : (
        missions.map((mission) => (
          <Card key={mission.id} className="p-4">
            <div className="flex flex-col space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">
                    {mission.source_language} → {mission.target_language}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Créée le{" "}
                    {format(new Date(mission.created_at), "d MMMM yyyy 'à' HH:mm", {
                      locale: fr,
                    })}
                  </p>
                  {mission.creator_first_name && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                      <UserCircle className="h-4 w-4" />
                      <span>
                        Créée par {mission.creator_first_name} {mission.creator_last_name}
                      </span>
                    </div>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setSelectedMission(mission.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Êtes-vous sûr de vouloir supprimer cette mission ?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. La mission sera supprimée
                        définitivement.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          if (selectedMission) {
                            onDelete(selectedMission);
                            setSelectedMission(null);
                          }
                        }}
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  {mission.mission_type === "immediate"
                    ? `Mission immédiate - ${mission.estimated_duration} minutes`
                    : "Mission programmée"}
                </Badge>
                {mission.mission_type === "scheduled" && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {format(
                      new Date(mission.scheduled_start_time!),
                      "d MMMM yyyy HH:mm",
                      { locale: fr }
                    )}{" "}
                    →{" "}
                    {format(
                      new Date(mission.scheduled_end_time!),
                      "d MMMM yyyy HH:mm",
                      { locale: fr }
                    )}
                  </Badge>
                )}
                <Badge variant="secondary" className={getStatusBadgeColor(mission.status)}>
                  {formatStatus(mission.status)}
                </Badge>
              </div>

              {mission.interpreter_profiles && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Interprète assigné :</span>
                  <span>
                    {mission.interpreter_profiles.first_name}{" "}
                    {mission.interpreter_profiles.last_name}
                  </span>
                </div>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
};
