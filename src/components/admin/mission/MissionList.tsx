
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
import { Trash2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  notifications?: MissionNotification[];
}

interface MissionNotification {
  status: "pending" | "accepted" | "declined" | "cancelled" | "cancelled_system";
  cancellation_reason?: string;
  interpreter_id: string;
  interpreter_profiles?: {
    first_name: string;
    last_name: string;
  };
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
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "declined":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "cancelled":
      case "cancelled_system":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  };

  const formatStatus = (status: string, reason?: string) => {
    switch (status) {
      case "accepted":
        return "Acceptée";
      case "declined":
        return "Refusée par l'interprète";
      case "cancelled":
        return "Annulée";
      case "cancelled_system":
        return `Annulée automatiquement${reason ? ` (${reason})` : ''}`;
      case "pending":
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
                <Badge variant="outline">
                  {mission.mission_type === "immediate"
                    ? `Mission immédiate - ${mission.estimated_duration} minutes`
                    : "Mission programmée"}
                </Badge>
                {mission.mission_type === "scheduled" && (
                  <Badge variant="outline">
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
                <Badge
                  className={getStatusBadgeColor(mission.status)}
                  variant="secondary"
                >
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
                  <Badge
                    variant="secondary"
                    className={getStatusBadgeColor(
                      mission.interpreter_profiles.status
                    )}
                  >
                    {mission.interpreter_profiles.status}
                  </Badge>
                </div>
              )}

              {/* Display notification statuses if available */}
              {mission.notifications && mission.notifications.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-sm font-medium mb-2">Notifications :</h4>
                  <div className="flex flex-wrap gap-2">
                    {mission.notifications.map((notification: MissionNotification, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge
                          className={getStatusBadgeColor(notification.status)}
                          variant="secondary"
                        >
                          {formatStatus(notification.status, notification.cancellation_reason)}
                        </Badge>
                        {notification.interpreter_profiles && (
                          <span className="text-sm">
                            {notification.interpreter_profiles.first_name}{" "}
                            {notification.interpreter_profiles.last_name}
                          </span>
                        )}
                        {notification.status === "cancelled_system" && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertCircle className="h-4 w-4 text-yellow-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Raison : {notification.cancellation_reason || 'Non spécifiée'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
};
