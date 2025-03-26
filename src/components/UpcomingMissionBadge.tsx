
import { Clock } from "lucide-react";
import { formatDistanceToNow, isAfter, isBefore, addMinutes, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { formatTimeString, formatDateDisplay } from "@/utils/dateTimeUtils";
import { format } from "date-fns";

interface UpcomingMissionBadgeProps {
  startTime: string;
  estimatedDuration: number;
  sourceLang?: string | null;
  targetLang?: string | null;
  useShortDateFormat?: boolean;
}

export const UpcomingMissionBadge = ({ 
  startTime, 
  estimatedDuration,
  sourceLang,
  targetLang,
  useShortDateFormat = false
}: UpcomingMissionBadgeProps) => {
  const [now, setNow] = useState(() => new Date());
  
  useEffect(() => {
    // Update 'now' every minute to ensure mission status is current
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Parse dates for mission start and end
  const missionStartDate = parseISO(startTime);
  const missionEndDate = addMinutes(missionStartDate, estimatedDuration);
  
  // Debug log to check time values
  console.log('[UpcomingMissionBadge]', {
    missionId: startTime,
    now: now.toISOString(),
    missionStart: missionStartDate.toISOString(),
    missionEnd: missionEndDate.toISOString(),
    isBeforeStart: isBefore(now, missionStartDate),
    isAfterEnd: isAfter(now, missionEndDate)
  });
  
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

  // Check mission status - if ended, don't render anything
  const missionStatus = getMissionStatus();
  if (missionStatus === "ended") {
    console.log('[UpcomingMissionBadge] Mission ended, not rendering badge');
    return null;
  }

  const getStatusDisplay = () => {
    const status = getMissionStatus();
    const languageInfo = sourceLang && targetLang ? ` (${sourceLang} → ${targetLang})` : '';
    // Use direct time extraction for consistent display
    const startHour = formatTimeString(startTime);
    const endHour = formatTimeString(addMinutes(parseISO(startTime), estimatedDuration).toISOString());
    const timeRange = `${startHour}-${endHour}`;
    
    // Format the date - short format or regular format
    const missionDate = useShortDateFormat 
      ? format(parseISO(startTime), 'dd/MM/yyyy')
      : formatDateDisplay(startTime);

    switch (status) {
      case "upcoming":
        return {
          text: `${missionDate} ${timeRange}${languageInfo}`,
          variant: "secondary" as const,
          flashingClass: "animate-pulse bg-gradient-to-r from-amber-300 to-orange-500"
        };
      case "in-progress":
        const remainingTime = formatDistanceToNow(missionEndDate, { 
          locale: fr, 
          addSuffix: true 
        });
        return {
          text: `Se termine ${remainingTime} ${missionDate} ${timeRange}${languageInfo}`,
          variant: "default" as const,
          flashingClass: "animate-pulse bg-gradient-to-r from-orange-400 to-amber-300"
        };
      case "ending-soon":
        return {
          text: `Dernières minutes ${missionDate} ${timeRange}${languageInfo}`,
          variant: "destructive" as const,
          flashingClass: "animate-pulse bg-gradient-to-r from-orange-500 to-amber-400"
        };
      default:
        return {
          text: "",
          variant: "outline" as const,
          flashingClass: ""
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <Badge 
      variant={status.variant} 
      className={cn(
        "gap-1.5 text-xs whitespace-normal text-wrap max-w-full transition-colors",
        status.flashingClass
      )}
    >
      <Clock className="h-3 w-3 shrink-0" />
      <span>{status.text}</span>
    </Badge>
  );
};
