
import { Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Mission } from "@/types/mission";
import { formatDateTimeDisplay } from "@/utils/dateTimeUtils";
import { UpcomingMissionBadge } from "@/components/UpcomingMissionBadge";

interface MissionDetailsProps {
  mission: Mission;
  currentUserId: string | null;
}

export const MissionDetails = ({ mission, currentUserId }: MissionDetailsProps) => {
  return (
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
            <p>Date: {formatDateTimeDisplay(mission.created_at)}</p>
            <p>Langues: {mission.source_language} → {mission.target_language}</p>
            <p>Durée: {mission.estimated_duration} minutes</p>
          </>
        ) : mission.scheduled_start_time && (
          <div className="space-y-1">
            {mission.status === 'accepted' && mission.assigned_interpreter_id === currentUserId && (
              <div className="mb-2">
                <UpcomingMissionBadge 
                  startTime={mission.scheduled_start_time}
                  estimatedDuration={mission.estimated_duration}
                  sourceLang={mission.source_language}
                  targetLang={mission.target_language}
                  showCountdown={true}
                />
              </div>
            )}
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
    </div>
  );
};
