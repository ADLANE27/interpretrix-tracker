
import React from "react";
import { Clock, Calendar, Bell } from "lucide-react";
import { formatDistanceToNow, isAfter, isBefore, addMinutes, parseISO, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { formatTimeString, formatDateDisplay } from "@/utils/dateTimeUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

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
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Parse dates and handle time calculations
  const missionStartDate = parseISO(startTime);
  const missionEndDate = addMinutes(missionStartDate, estimatedDuration);
  
  // Get time directly without timezone conversion
  const startHour = formatTimeString(startTime);
  const endHour = formatTimeString(addMinutes(parseISO(startTime), estimatedDuration).toISOString());
  
  // Calculate time differences for status determination
  const minutesToStart = differenceInMinutes(missionStartDate, now);
  const minutesFromStart = differenceInMinutes(now, missionStartDate);
  const minutesLeft = differenceInMinutes(missionEndDate, now);
  
  // Console logs for debugging
  console.log(`Mission start: ${missionStartDate.toISOString()}, now: ${now.toISOString()}`);
  console.log(`Minutes to start: ${minutesToStart}, minutes from start: ${minutesFromStart}, minutes left: ${minutesLeft}`);
  
  const getMissionStatus = () => {
    if (minutesToStart > 0) {
      // Mission hasn't started yet
      return "upcoming";
    } else if (minutesLeft <= 0) {
      // Mission has ended
      return "ended";
    } else {
      // Mission is in progress
      return minutesLeft <= 15 ? "ending-soon" : "in-progress";
    }
  };

  const status = getMissionStatus();
  console.log(`Mission status: ${status}`);

  const getStatusDisplay = () => {
    const languageInfo = sourceLang && targetLang ? `${sourceLang} → ${targetLang}` : '';
    const timeRange = `${startHour}-${endHour}`;
    const missionDate = formatDateDisplay(startTime);

    switch (status) {
      case "upcoming":
        return {
          icon: Calendar,
          text: minutesToStart <= 60 
            ? `Dans ${minutesToStart}min` 
            : `${missionDate}`,
          detailText: `${timeRange} ${languageInfo}`,
          variant: "secondary" as const,
          bgClass: "bg-blue-50 dark:bg-blue-900/20",
          textClass: "text-blue-700 dark:text-blue-300"
        };
      case "in-progress":
        return {
          icon: Bell,
          text: `En cours`,
          detailText: `Fin dans ${minutesLeft}min ${languageInfo}`,
          variant: "default" as const,
          bgClass: "bg-green-50 dark:bg-green-900/20",
          textClass: "text-green-700 dark:text-green-300"
        };
      case "ending-soon":
        return {
          icon: Bell,
          text: `Fin proche`,
          detailText: `Dans ${minutesLeft}min ${languageInfo}`,
          variant: "destructive" as const,
          bgClass: "bg-red-50 dark:bg-red-900/20",
          textClass: "text-red-700 dark:text-red-300"
        };
      case "ended":
        return {
          icon: Clock,
          text: `Terminée`,
          detailText: `${timeRange} ${languageInfo}`,
          variant: "outline" as const,
          bgClass: "bg-gray-50 dark:bg-gray-800",
          textClass: "text-gray-500 dark:text-gray-400"
        };
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "w-full rounded-md px-3 py-2 flex items-center gap-2",
            statusDisplay.bgClass,
            status === "in-progress" && "animate-pulse"
          )}>
            <StatusIcon className={cn("h-4 w-4", statusDisplay.textClass)} />
            <div className="flex flex-col items-start">
              <span className={cn("font-medium text-sm", statusDisplay.textClass)}>
                {statusDisplay.text}
              </span>
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {statusDisplay.detailText}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="p-4 max-w-xs">
          <div className="space-y-2">
            <div className="font-medium">{status === "upcoming" ? "Mission à venir" : 
              status === "in-progress" ? "Mission en cours" : 
              status === "ending-soon" ? "Mission se termine bientôt" : 
              "Mission terminée"}</div>
            <div className="text-sm">
              <p>Date: {formatDateDisplay(startTime)}</p>
              <p>Horaire: {startHour} - {endHour}</p>
              {sourceLang && targetLang && (
                <p>Langues: {sourceLang} → {targetLang}</p>
              )}
              <p>Durée: {estimatedDuration} minutes</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
