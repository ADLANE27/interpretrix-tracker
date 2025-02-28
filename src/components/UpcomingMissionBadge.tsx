
import { Clock } from "lucide-react";
import { formatDistanceToNow, addMinutes, isAfter, isBefore, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

interface UpcomingMissionBadgeProps {
  startTime: string;
  estimatedDuration: number;
}

export const UpcomingMissionBadge = ({ startTime, estimatedDuration }: UpcomingMissionBadgeProps) => {
  const [now, setNow] = useState(() => new Date());
  const timeZone = 'Europe/Paris';
  
  useEffect(() => {
    // Update time every minute
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Convert times to French timezone
  const missionStartDate = toZonedTime(new Date(startTime), timeZone);
  const missionEndDate = addMinutes(missionStartDate, estimatedDuration);
  const nowInFrance = toZonedTime(now, timeZone);
  
  const getMissionStatus = () => {
    if (isBefore(nowInFrance, missionStartDate)) {
      return "upcoming";
    } else if (isAfter(nowInFrance, missionEndDate)) {
      return "ended";
    } else {
      // Mission is in progress
      const minutesLeft = Math.round((missionEndDate.getTime() - nowInFrance.getTime()) / (1000 * 60));
      return minutesLeft <= 15 ? "ending-soon" : "in-progress";
    }
  };

  const getStatusDisplay = () => {
    const status = getMissionStatus();

    switch (status) {
      case "upcoming":
        return {
          text: `Dans ${formatDistanceToNow(missionStartDate, { 
            locale: fr,
            addSuffix: false 
          })} (${estimatedDuration}min)`,
          variant: "secondary" as const
        };
      case "in-progress":
        const remainingTime = formatDistanceToNow(missionEndDate, { 
          locale: fr, 
          addSuffix: true 
        });
        return {
          text: `Se termine ${remainingTime}`,
          variant: "default" as const
        };
      case "ending-soon":
        return {
          text: "Dernières minutes",
          variant: "destructive" as const
        };
      case "ended":
        return {
          text: `Mission terminée (${formatInTimeZone(missionEndDate, timeZone, 'HH:mm', { locale: fr })})`,
          variant: "outline" as const
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <Badge 
      variant={status.variant} 
      className={cn(
        "gap-1.5",
        getMissionStatus() === "in-progress" && "animate-pulse"
      )}
    >
      <Clock className="h-3 w-3" />
      <span>{status.text}</span>
    </Badge>
  );
};
