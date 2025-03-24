
import React from 'react';
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from '@/lib/utils';
import { StatusButton, Status } from './StatusButton';
import { useStatusUpdater } from '@/hooks/useStatusUpdater';
import { getStatusConfig } from '@/utils/statusConfig';

interface StatusButtonsBarProps {
  currentStatus?: Status;
  onStatusChange?: (newStatus: Status) => Promise<void>;
  variant?: 'default' | 'compact';
}

export const StatusButtonsBar: React.FC<StatusButtonsBarProps> = ({ 
  currentStatus = 'available', 
  onStatusChange,
  variant = 'default'
}) => {
  const isMobile = useIsMobile();
  const statusConfig = getStatusConfig();
  
  const {
    localStatus,
    isUpdating,
    isCircuitBroken,
    isProcessing,
    handleStatusChange
  } = useStatusUpdater({
    currentStatus,
    onStatusChange
  });

  return (
    <div className={cn(
      "flex items-center gap-2 mx-auto w-full max-w-screen-sm overflow-x-auto hide-scrollbar py-1",
      variant === 'compact' ? 'px-1' : 'px-4'
    )}>
      {(Object.keys(statusConfig) as Status[]).map((statusKey) => (
        <StatusButton
          key={statusKey}
          status={statusKey}
          config={statusConfig[statusKey]}
          isActive={localStatus === statusKey}
          isUpdating={isUpdating}
          isDisabled={isCircuitBroken || isProcessing}
          variant={variant}
          isMobile={isMobile}
          onClick={() => handleStatusChange(statusKey, statusConfig)}
        />
      ))}
    </div>
  );
};
