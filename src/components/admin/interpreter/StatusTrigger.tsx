
import React from 'react';
import { useIsMobile } from "@/hooks/use-mobile";
import { Status, StatusConfigItem } from "./types/status-types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StatusTriggerProps {
  displayFormat: "badge" | "button";
  statusConfig: StatusConfigItem;
  status: Status;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  isConnected?: boolean;
}

export const StatusTrigger: React.FC<StatusTriggerProps> = ({
  displayFormat,
  statusConfig,
  status,
  className = "",
  onClick,
  disabled = false,
  isConnected = true
}) => {
  const isMobile = useIsMobile();
  const StatusIcon = statusConfig.icon;
  const displayLabel = isMobile ? statusConfig.mobileLabel : statusConfig.label;
  
  // Handle click with error prevention
  const handleClick = (e: React.MouseEvent) => {
    if (disabled || !isConnected) return;
    
    if (onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
  };
  
  // Add visual indicator for connection status
  const connectionStyles = !isConnected 
    ? "opacity-70 cursor-not-allowed" 
    : disabled 
      ? "opacity-80 cursor-not-allowed" 
      : "cursor-pointer hover:opacity-95 transition-opacity";
  
  if (displayFormat === "badge") {
    return (
      <div
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color} ${connectionStyles} ${className}`}
        onClick={handleClick}
        aria-disabled={disabled || !isConnected}
        role="button"
        tabIndex={disabled || !isConnected ? -1 : 0}
      >
        {displayLabel}
        {!isConnected && <span className="ml-1 inline-block animate-pulse">•</span>}
      </div>
    );
  } else {
    return (
      <div
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${statusConfig.color} ${connectionStyles} ${className}`}
        onClick={handleClick}
        aria-disabled={disabled || !isConnected}
        role="button"
        tabIndex={disabled || !isConnected ? -1 : 0}
      >
        <StatusIcon className="h-4 w-4" />
        <span>{displayLabel}</span>
        {!isConnected && <span className="ml-1 inline-block animate-pulse">•</span>}
      </div>
    );
  }
};
