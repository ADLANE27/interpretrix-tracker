
import { Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

interface UpcomingMissionBadgeProps {
  startTime: string;
  estimatedDuration: number;
}

export const UpcomingMissionBadge = ({ startTime, estimatedDuration }: UpcomingMissionBadgeProps) => {
  const missionDate = new Date(startTime);
  const hoursUntilMission = (missionDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
  
  const getVariant = () => {
    if (hoursUntilMission <= 2) return "destructive";
    if (hoursUntilMission <= 24) return "secondary";
    return "outline";
  };

  return (
    <Badge 
      variant={getVariant()} 
      className={cn(
        "gap-1.5",
        hoursUntilMission <= 2 ? "animate-pulse" : ""
      )}
    >
      <Clock className="h-3 w-3" />
      <span>
        Dans {formatDistanceToNow(missionDate, { locale: fr })}
        {estimatedDuration && ` (${estimatedDuration}min)`}
      </span>
    </Badge>
  );
};
