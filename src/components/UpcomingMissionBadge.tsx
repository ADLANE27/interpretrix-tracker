
import { Clock } from "lucide-react";
import { formatDistanceToNow, isAfter, isBefore, addMinutes, parseISO, differenceInSeconds, differenceInMinutes } from "date-fns";
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
  flashBefore?: number;
}

export const UpcomingMissionBadge = ({ 
  startTime, 
  estimatedDuration,
  sourceLang,
  targetLang,
  showCountdown = true,
  flashBefore = 30
}: UpcomingMissionBadgeProps) => {
  const [now, setNow] = useState(() => new Date());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000); // Update every second for smoother countdown

    return () => clearInterval(interval);
  }, []);

  const missionStartDate = parseISO(startTime);
  const missionEndDate = addMinutes(missionStartDate, estimatedDuration);
  
  const getMissionStatus = () => {
    if (isBefore(now, missionStartDate)) {
      const minutesToStart = differenceInMinutes(missionStartDate, now);
      return minutesToStart <= flashBefore ? "starting-soon" : "upcoming";
    } else if (isAfter(now, missionEndDate)) {
      return "ended";
    } else {
      const minutesLeft = differenceInMinutes(missionEndDate, now);
      return minutesLeft <= flashBefore ? "ending-soon" : "in-progress";
    }
  };

  const formatCountdown = () => {
    if (isBefore(now, missionStartDate)) {
      // Countdown to start
      const diffSeconds = differenceInSeconds(missionStartDate, now);
      const hours = Math.floor(diffSeconds / 3600);
      const minutes = Math.floor((diffSeconds % 3600) / 60);
      const seconds = diffSeconds % 60;
      
      if (hours > 0) {
        return `Dans ${hours}h${minutes > 0 ? minutes + 'min' : ''}`;
      } else if (minutes > 0) {
        return `Dans ${minutes}min${seconds}s`;
      } else {
        return `Dans ${seconds}s`;
      }
    } else if (isBefore(now, missionEndDate)) {
      // Countdown to end
      const diffSeconds = differenceInSeconds(missionEndDate, now);
      const hours = Math.floor(diffSeconds / 3600);
      const minutes = Math.floor((diffSeconds % 3600) / 60);
      const seconds = diffSeconds % 60;
      
      if (hours > 0) {
        return `Reste ${hours}h${minutes > 0 ? minutes + 'min' : ''}`;
      } else if (minutes > 0) {
        return `Reste ${minutes}min${seconds}s`;
      } else {
        return `Reste ${seconds}s`;
      }
    }
    return "";
  };

  const getStatusDisplay = () => {
    const status = getMissionStatus();
    const languageInfo = sourceLang && targetLang ? ` (${sourceLang} → ${targetLang})` : '';
    const startHour = formatTimeString(startTime);
    const endHour = formatTimeString(addMinutes(parseISO(startTime), estimatedDuration).toISOString());
    const timeRange = `${startHour}-${endHour}`;
    const missionDate = formatDateDisplay(startTime);
    const countdown = showCountdown ? formatCountdown() : '';
    const countdownPrefix = countdown ? `${countdown} • ` : '';

    switch (status) {
      case "upcoming":
        return {
          text: `${countdownPrefix}${missionDate} ${timeRange}${languageInfo}`,
          variant: "secondary" as const
        };
      case "starting-soon":
        return {
          text: `${countdownPrefix}Commence bientôt ${missionDate} ${timeRange}${languageInfo}`,
          variant: "warning" as const,
          flash: true
        };
      case "in-progress":
        return {
          text: `${countdownPrefix}Se termine ${formatDistanceToNow(missionEndDate, { locale: fr, addSuffix: true })} ${timeRange}${languageInfo}`,
          variant: "default" as const
        };
      case "ending-soon":
        return {
          text: `${countdownPrefix}Dernières minutes ${timeRange}${languageInfo}`,
          variant: "destructive" as const,
          flash: true
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
        "gap-1.5 text-xs whitespace-normal text-wrap max-w-full px-2.5 py-1.5 rounded-full",
        status.flash && "animate-pulse bg-orange-100 text-orange-800 border-orange-200",
        getMissionStatus() === "in-progress" && "animate-pulse"
      )}
    >
      <Clock className="h-3 w-3 shrink-0" />
      <span>{status.text}</span>
    </Badge>
  );
};
