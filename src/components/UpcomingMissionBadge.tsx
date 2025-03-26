
import { Clock } from "lucide-react";
import { formatDistanceToNow, isAfter, isBefore, addMinutes, parseISO } from "date-fns";
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
  className?: string;
  compact?: boolean;
}

export const UpcomingMissionBadge = ({ 
  startTime, 
  estimatedDuration,
  sourceLang,
  targetLang,
  className,
  compact = false
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

  const getStatusDisplay = () => {
    const status = getMissionStatus();
    const languageInfo = sourceLang && targetLang ? ` (${sourceLang} → ${targetLang})` : '';
    // Use direct time extraction for consistent display
    const startHour = formatTimeString(startTime);
    const endHour = formatTimeString(addMinutes(parseISO(startTime), estimatedDuration).toISOString());
    const timeRange = `${startHour}-${endHour}`;
    // Format the date
    const missionDate = formatDateDisplay(startTime);

    // Compact display for cards with limited space
    const compactDisplay = {
      upcoming: `${startHour}`,
      "in-progress": `En cours`,
      "ending-soon": `Fin proche`,
      ended: `Terminée`
    };

    switch (status) {
      case "upcoming":
        return {
          text: compact ? compactDisplay[status] : `${missionDate} ${timeRange}${languageInfo}`,
          tooltipText: `${missionDate} ${timeRange}${languageInfo}`,
          variant: "secondary" as const,
          flashingClass: "animate-pulse bg-gradient-to-r from-amber-300 to-orange-500"
        };
      case "in-progress":
        const remainingTime = formatDistanceToNow(missionEndDate, { 
          locale: fr, 
          addSuffix: true 
        });
        return {
          text: compact ? compactDisplay[status] : `Se termine ${remainingTime} ${missionDate} ${timeRange}${languageInfo}`,
          tooltipText: `Se termine ${remainingTime} ${missionDate} ${timeRange}${languageInfo}`,
          variant: "default" as const,
          flashingClass: "animate-pulse bg-gradient-to-r from-orange-400 to-amber-300"
        };
      case "ending-soon":
        return {
          text: compact ? compactDisplay[status] : `Dernières minutes ${missionDate} ${timeRange}${languageInfo}`,
          tooltipText: `Dernières minutes ${missionDate} ${timeRange}${languageInfo}`,
          variant: "destructive" as const,
          flashingClass: "animate-pulse bg-gradient-to-r from-orange-500 to-amber-400"
        };
      case "ended":
        return {
          text: compact ? compactDisplay[status] : `Mission terminée ${missionDate} ${timeRange}${languageInfo}`,
          tooltipText: `Mission terminée ${missionDate} ${timeRange}${languageInfo}`,
          variant: "outline" as const,
          flashingClass: ""
        };
    }
  };

  const status = getStatusDisplay();
  const missionStatus = getMissionStatus();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={status.variant} 
            className={cn(
              "gap-1 text-xs whitespace-nowrap overflow-hidden text-ellipsis transition-colors",
              compact ? "max-w-full px-2 py-0.5" : "max-w-full",
              missionStatus !== "ended" && status.flashingClass,
              className
            )}
          >
            <Clock className={cn("shrink-0", compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
            <span>{status.text}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-center">
          {status.tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
