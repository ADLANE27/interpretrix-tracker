
import React, { useEffect, useRef } from 'react';
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
  const triggerRef = useRef<HTMLDivElement>(null);
  
  // Add animation effect when status changes
  useEffect(() => {
    if (triggerRef.current) {
      // Remove any existing animation class first
      triggerRef.current.classList.remove('pulse-animation');
      
      // Force a reflow to ensure animation restarts
      void triggerRef.current.offsetWidth;
      
      // Add animation class
      triggerRef.current.classList.add('pulse-animation');
      
      // Remove animation class after animation completes
      const timeout = setTimeout(() => {
        if (triggerRef.current) {
          triggerRef.current.classList.remove('pulse-animation');
        }
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [status, statusConfig]);
  
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
  
  // Log status updates with more details for debugging
  console.log(`[StatusTrigger] Rendering status: ${status} with config:`, {
    label: statusConfig.label,
    color: statusConfig.color,
    icon: statusConfig.icon.name
  });
  
  if (displayFormat === "badge") {
    return (
      <div
        ref={triggerRef}
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color} ${connectionStyles} ${className}`}
        onClick={handleClick}
        aria-disabled={disabled || !isConnected}
        role="button"
        tabIndex={disabled || !isConnected ? -1 : 0}
        data-status={status} // Add data attribute for debugging
      >
        {displayLabel}
        {!isConnected && <span className="ml-1 inline-block animate-pulse">•</span>}
      </div>
    );
  } else {
    return (
      <div
        ref={triggerRef}
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${statusConfig.color} ${connectionStyles} ${className}`}
        onClick={handleClick}
        aria-disabled={disabled || !isConnected}
        role="button"
        tabIndex={disabled || !isConnected ? -1 : 0}
        data-status={status} // Add data attribute for debugging
      >
        <StatusIcon className="h-4 w-4" />
        <span>{displayLabel}</span>
        {!isConnected && <span className="ml-1 inline-block animate-pulse">•</span>}
      </div>
    );
  }
};
