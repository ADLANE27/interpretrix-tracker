
import { Clock } from "lucide-react";
import { formatDistanceToNow, isAfter, isBefore, addMinutes, parseISO, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { formatTimeString, formatDateDisplay } from "@/utils/dateTimeUtils";
import { format } from "date-fns";
import { EVENT_MISSION_STATUS_UPDATE } from "@/lib/events";
import { eventEmitter } from "@/lib/events";

interface UpcomingMissionBadgeProps {
  startTime: string;
  estimatedDuration: number;
  sourceLang?: string | null;
  targetLang?: string | null;
  useShortDateFormat?: boolean;
  className?: string; // Add this prop to allow custom styling
}

export const UpcomingMissionBadge = ({ 
  startTime, 
  estimatedDuration,
  sourceLang,
  targetLang,
  useShortDateFormat = false,
  className // Add this parameter
}: UpcomingMissionBadgeProps) => {
  const [now, setNow] = useState(() => new Date());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);
  
  // Listen for mission status updates
  useEffect(() => {
    const handleMissionStatusUpdate = () => {
      setNow(new Date());
    };
    
    eventEmitter.on(EVENT_MISSION_STATUS_UPDATE, handleMissionStatusUpdate);
    
    return () => {
      eventEmitter.off(EVENT_MISSION_STATUS_UPDATE, handleMissionStatusUpdate);
    };
  }, []);

  const missionStartDate = parseISO(startTime);
  const missionEndDate = addMinutes(missionStartDate, estimatedDuration);
  
  const getMissionStatus = () => {
    // Check if the mission is currently in progress
    if (isWithinInterval(now, { start: missionStartDate, end: missionEndDate })) {
      return "in-progress";
    } else if (isBefore(now, missionStartDate)) {
      return "upcoming";
    } else if (isAfter(now, missionEndDate)) {
      return "ended";
    } else {
      const minutesLeft = Math.round((missionEndDate.getTime() - now.getTime()) / (1000 * 60));
      return minutesLeft <= 15 ? "ending-soon" : "in-progress";
    }
  };

  const getStatusDisplay = () => {
    const status = getMissionStatus();
    const languageInfo = sourceLang && targetLang ? ` (${sourceLang} → ${targetLang})` : '';
    const startHour = formatTimeString(startTime);
    const endHour = formatTimeString(addMinutes(parseISO(startTime), estimatedDuration).toISOString());
    const timeRange = `${startHour}-${endHour}`;
    
    const missionDate = useShortDateFormat 
      ? format(parseISO(startTime), 'dd/MM/yyyy')
      : formatDateDisplay(startTime);

    switch (status) {
      case "upcoming":
        return {
          text: `${missionDate} ${timeRange}${languageInfo}`,
          variant: "secondary" as const,
          flashingClass: "animate-pulse bg-red-500 text-white"
        };
      case "in-progress":
        const remainingTime = formatDistanceToNow(missionEndDate, { 
          locale: fr, 
          addSuffix: true 
        });
        return {
          text: `En cours, fin ${remainingTime} ${missionDate} ${timeRange}${languageInfo}`,
          variant: "destructive" as const,
          flashingClass: "animate-pulse bg-red-500 text-white"
        };
      case "ending-soon":
        return {
          text: `Dernières minutes ${missionDate} ${timeRange}${languageInfo}`,
          variant: "destructive" as const,
          flashingClass: "animate-pulse bg-red-500 text-white"
        };
      case "ended":
        return {
          text: `Mission terminée ${missionDate} ${timeRange}${languageInfo}`,
          variant: "outline" as const,
          flashingClass: ""
        };
    }
  };

  const status = getStatusDisplay();
  const missionStatus = getMissionStatus();

  return (
    <Badge 
      variant={status.variant} 
      className={cn(
        "gap-1.5 text-xs whitespace-normal text-wrap max-w-full transition-colors",
        missionStatus !== "ended" && status.flashingClass,
        className // Add custom className with optional override
      )}
    >
      <Clock className="h-3 w-3 shrink-0" />
      <span>{status.text}</span>
    </Badge>
  );
};
