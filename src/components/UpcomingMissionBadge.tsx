
import { Clock } from "lucide-react";
import { formatDistanceToNow, isAfter, isBefore, addMinutes, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface UpcomingMissionBadgeProps {
  startTime: string;
  estimatedDuration: number;
  sourceLang?: string | null;
  targetLang?: string | null;
}

export const UpcomingMissionBadge = ({ 
  startTime, 
  estimatedDuration,
  sourceLang,
  targetLang 
}: UpcomingMissionBadgeProps) => {
  const [now, setNow] = useState(() => new Date());
  
  useEffect(() => {
    // Update time every minute
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const missionStartDate = new Date(startTime);
  const missionEndDate = addMinutes(missionStartDate, estimatedDuration);
  
  const getMissionStatus = () => {
    if (isBefore(now, missionStartDate)) {
      return "upcoming";
    } else if (isAfter(now, missionEndDate)) {
      return "ended";
    } else {
      // Mission is in progress
      const minutesLeft = Math.round((missionEndDate.getTime() - now.getTime()) / (1000 * 60));
      return minutesLeft <= 15 ? "ending-soon" : "in-progress";
    }
  };

  const getStatusDisplay = () => {
    const status = getMissionStatus();
    const languageInfo = sourceLang && targetLang ? ` (${sourceLang} → ${targetLang})` : '';

    switch (status) {
      case "upcoming":
        return {
          text: `Dans ${formatDistanceToNow(missionStartDate, { 
            locale: fr,
            addSuffix: false 
          })} (${estimatedDuration}min)${languageInfo}`,
          variant: "secondary" as const
        };
      case "in-progress":
        const remainingTime = formatDistanceToNow(missionEndDate, { 
          locale: fr, 
          addSuffix: true 
        });
        return {
          text: `Se termine ${remainingTime}${languageInfo}`,
          variant: "default" as const
        };
      case "ending-soon":
        return {
          text: `Dernières minutes${languageInfo}`,
          variant: "destructive" as const
        };
      case "ended":
        return {
          text: `Mission terminée (${format(missionEndDate, 'HH:mm')})${languageInfo}`,
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
