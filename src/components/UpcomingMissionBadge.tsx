
import { Clock } from "lucide-react";
import { formatDistanceToNow, isAfter, isBefore, addMinutes, parseISO, differenceInSeconds, differenceInMinutes, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { formatTimeString, formatDateDisplay } from "@/utils/dateTimeUtils";

interface UpcomingMissionBadgeProps {
  startTime: string;
  estimatedDuration: number;
  sourceLang?: string | null;
  targetLang?: string | null;
  showCountdown?: boolean;
}

export const UpcomingMissionBadge = ({ 
  startTime, 
  estimatedDuration,
  sourceLang,
  targetLang,
  showCountdown = false
}: UpcomingMissionBadgeProps) => {
  const [now, setNow] = useState(() => new Date());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const missionStartDate = parseISO(startTime);
  const missionEndDate = addMinutes(missionStartDate, estimatedDuration);
  
  const getMissionStatus = () => {
    if (isBefore(now, missionStartDate)) {
      return "upcoming";
    } else if (isAfter(now, missionEndDate)) {
      return "ended";
    } else {
      const minutesLeft = Math.round((missionEndDate.getTime() - now.getTime()) / (1000 * 60));
      return minutesLeft <= 15 ? "ending-soon" : "in-progress";
    }
  };

  const formatCountdown = () => {
    if (isBefore(now, missionStartDate)) {
      // Countdown to start
      const diffSeconds = differenceInSeconds(missionStartDate, now);
      const hours = Math.floor(diffSeconds / 3600);
      const minutes = Math.floor((diffSeconds % 3600) / 60);
      
      if (hours > 0) {
        return `Dans ${hours}h${minutes > 0 ? minutes + 'min' : ''}`;
      } else if (minutes > 0) {
        return `Dans ${minutes} min`;
      } else {
        return "Commence très bientôt";
      }
    } else if (isBefore(now, missionEndDate)) {
      // Countdown to end
      const diffSeconds = differenceInSeconds(missionEndDate, now);
      const hours = Math.floor(diffSeconds / 3600);
      const minutes = Math.floor((diffSeconds % 3600) / 60);
      
      if (hours > 0) {
        return `Reste ${hours}h${minutes > 0 ? minutes + 'min' : ''}`;
      } else if (minutes > 0) {
        return `Reste ${minutes} min`;
      } else {
        return "Se termine très bientôt";
      }
    }
    return "";
  };

  const getStatusDisplay = () => {
    const status = getMissionStatus();
    const languageInfo = sourceLang && targetLang ? ` (${sourceLang} → ${targetLang})` : '';
    // Use direct time extraction for consistent display
    const startHour = formatTimeString(startTime);
    const endHour = formatTimeString(addMinutes(parseISO(startTime), estimatedDuration).toISOString());
    const timeRange = `${startHour}-${endHour}`;
    // Format the date
    const missionDate = formatDateDisplay(startTime);
    
    // Add countdown if enabled
    const countdown = showCountdown ? formatCountdown() : '';
    const countdownPrefix = countdown ? `${countdown} • ` : '';

    switch (status) {
      case "upcoming":
        return {
          text: `${countdownPrefix}${missionDate} ${timeRange}${languageInfo}`,
          variant: "secondary" as const
        };
      case "in-progress":
        const remainingTime = formatDistanceToNow(missionEndDate, { 
          locale: fr, 
          addSuffix: true 
        });
        return {
          text: `${countdown ? countdown + ' • ' : ''}Se termine ${remainingTime} ${missionDate} ${timeRange}${languageInfo}`,
          variant: "default" as const
        };
      case "ending-soon":
        return {
          text: `${countdownPrefix}Dernières minutes ${missionDate} ${timeRange}${languageInfo}`,
          variant: "destructive" as const
        };
      case "ended":
        return {
          text: `Mission terminée ${missionDate} ${timeRange}${languageInfo}`,
          variant: "outline" as const
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <Badge 
      variant={status.variant} 
      className={cn(
        "gap-1.5 text-xs whitespace-normal text-wrap max-w-full px-2 py-1",
        getMissionStatus() === "in-progress" && "animate-pulse"
      )}
    >
      <Clock className="h-3 w-3 shrink-0" />
      <span>{status.text}</span>
    </Badge>
  );
};
