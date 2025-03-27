
import React from 'react';
import { useIsMobile } from "@/hooks/use-mobile";
import { Status, StatusConfigItem } from "./types/status-types";

interface StatusTriggerProps {
  displayFormat: "badge" | "button";
  statusConfig: StatusConfigItem;
  status: Status;
  className?: string;
}

export const StatusTrigger: React.FC<StatusTriggerProps> = ({
  displayFormat,
  statusConfig,
  status,
  className = ""
}) => {
  const isMobile = useIsMobile();
  const StatusIcon = statusConfig.icon;
  const displayLabel = isMobile ? statusConfig.mobileLabel : statusConfig.label;
  
  if (displayFormat === "badge") {
    return (
      <div className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity ${statusConfig.color} ${className}`}>
        {displayLabel}
      </div>
    );
  } else {
    return (
      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm cursor-pointer hover:opacity-90 transition-opacity ${statusConfig.color} ${className}`}>
        <StatusIcon className="h-4 w-4" />
        <span>{displayLabel}</span>
      </div>
    );
  }
};
