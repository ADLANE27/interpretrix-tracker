
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
    return (
      <Badge 
        variant="outline" 
        className={`flex items-center gap-1 cursor-pointer ${statusConfig.color} ${className}`}
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
