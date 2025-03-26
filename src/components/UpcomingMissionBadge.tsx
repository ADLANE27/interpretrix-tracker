
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
    // Convert all dates to timestamps for direct comparison
    const currentTime = now.getTime();
    const startTime = missionStartDate.getTime();
    const endTime = missionEndDate.getTime();
    
    console.log(`[MissionBadge] Status check - Current: ${now.toISOString()}`);
    console.log(`[MissionBadge] Status check - Start: ${missionStartDate.toISOString()}`);
    console.log(`[MissionBadge] Status check - End: ${missionEndDate.toISOString()}`);
    console.log(`[MissionBadge] Raw timestamps - Current: ${currentTime}, Start: ${startTime}, End: ${endTime}`);
    console.log(`[MissionBadge] Current > Start? ${currentTime >= startTime}`);
    
    // Check if mission has started (current time is after or equal to start time)
    if (currentTime >= startTime) {
      // Check if mission has ended
      if (currentTime > endTime) {
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
        // For upcoming missions, show countdown to start
        countdownText = formatCountdown(missionStartDate, now);
        console.log(`[MissionBadge] Countdown for upcoming: ${countdownText}`);
      } else if (status === "in-progress" || status === "ending-soon") {
        // For in-progress missions, show remaining time
        countdownText = `Se termine dans ${differenceInMinutes(missionEndDate, now)}min`;
        console.log(`[MissionBadge] Countdown for in-progress: ${countdownText}`);
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
