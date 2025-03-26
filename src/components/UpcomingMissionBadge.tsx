
import { Clock } from "lucide-react";
import { isAfter, isBefore, addMinutes, parseISO, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { formatTimeString, formatDateDisplay, formatCountdown } from "@/utils/dateTimeUtils";

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
    console.log(`[MissionBadge] Current time: ${now.toISOString()}`);
    console.log(`[MissionBadge] Mission start: ${missionStartDate.toISOString()}`);
    console.log(`[MissionBadge] Mission end: ${missionEndDate.toISOString()}`);
    
    // Compare times directly without timezone adjustments
    // Check if mission has started (current time is after or equal to start time)
    if (now.getTime() >= missionStartDate.getTime()) {
      // Check if mission has ended
      if (now.getTime() > missionEndDate.getTime()) {
        console.log(`[MissionBadge] Mission has ended`);
        return "ended";
      } else {
        // Mission is in progress
        const minutesLeft = differenceInMinutes(missionEndDate, now);
        console.log(`[MissionBadge] Mission in progress, minutes left: ${minutesLeft}`);
        return minutesLeft <= flashBefore ? "ending-soon" : "in-progress";
      }
    } else {
      // Mission hasn't started yet
      const minutesToStart = differenceInMinutes(missionStartDate, now);
      console.log(`[MissionBadge] Minutes to start: ${minutesToStart}`);
      return minutesToStart <= flashBefore ? "starting-soon" : "upcoming";
    }
  };

  const getStatusDisplay = () => {
    const status = getMissionStatus();
    const languageInfo = sourceLang && targetLang ? ` (${sourceLang} → ${targetLang})` : '';
    const startHour = formatTimeString(startTime);
    const endHour = formatTimeString(addMinutes(parseISO(startTime), estimatedDuration).toISOString());
    const timeRange = `${startHour}-${endHour}`;
    const missionDate = formatDateDisplay(startTime);
    
    let countdownText = "";
    if (showCountdown) {
      if (status === "upcoming" || status === "starting-soon") {
        countdownText = formatCountdown(missionStartDate, now);
      } else if (status === "in-progress" || status === "ending-soon") {
        countdownText = `Se termine dans ${differenceInMinutes(missionEndDate, now)}min`;
      }
    }
    
    const countdownPrefix = countdownText ? `${countdownText} • ` : '';

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
          text: `En cours • ${timeRange}${languageInfo}`,
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
        status.flash && "animate-mission-flash",
        getMissionStatus() === "in-progress" && "bg-blue-100 text-blue-800"
      )}
    >
      <Clock className="h-3 w-3 shrink-0" />
      <span>{status.text}</span>
    </Badge>
  );
};
