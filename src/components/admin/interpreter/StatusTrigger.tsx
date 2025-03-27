
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Status } from './types/status-types';

interface StatusTriggerProps {
  statusConfig: {
    color: string;
    label: string;
    mobileLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  };
  status: Status;
  displayFormat: "badge" | "button";
  className?: string;
}

export const StatusTrigger: React.FC<StatusTriggerProps> = ({
  statusConfig,
  status,
  displayFormat,
  className = ""
}) => {
  const StatusIcon = statusConfig.icon;

  if (displayFormat === "badge") {
    const getBadgeColor = () => {
      switch (status) {
        case "available":
          return "bg-green-100 text-green-800 hover:bg-green-200";
        case "busy":
          return "bg-violet-100 text-violet-800 hover:bg-violet-200";
        case "pause":
          return "bg-orange-100 text-orange-800 hover:bg-orange-200";
        case "unavailable":
          return "bg-red-100 text-red-800 hover:bg-red-200";
        default:
          return "bg-gray-100 text-gray-800 hover:bg-gray-200";
      }
    };

    return (
      <Badge 
        variant="outline" 
        className={`flex items-center gap-1 cursor-pointer ${getBadgeColor()} ${className}`}
      >
        <StatusIcon className="h-3 w-3" />
        <span>{statusConfig.label}</span>
      </Badge>
    );
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className={`gap-1 ${className}`}
    >
      <StatusIcon className="h-4 w-4" />
      <span>{statusConfig.label}</span>
    </Button>
  );
};
