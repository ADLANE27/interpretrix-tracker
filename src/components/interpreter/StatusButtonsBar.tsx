
import React from 'react';
import { motion } from 'framer-motion';
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from '@/lib/utils';
import { StatusBarButton } from './StatusBarButton';
import { useStatusButtonBar } from '@/hooks/useStatusButtonBar';
import { Status, statusButtonBarConfig } from '@/utils/statusButtonBarConfig';

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
  const { localStatus, isUpdating, handleStatusChange } = useStatusButtonBar(currentStatus, onStatusChange);

  return (
    <div className={cn(
      "flex items-center gap-2 mx-auto w-full max-w-screen-sm overflow-x-auto hide-scrollbar py-1",
      variant === 'compact' ? 'px-1' : 'px-4'
    )}>
      {(Object.keys(statusButtonBarConfig) as Status[]).map((statusKey) => {
        const config = statusButtonBarConfig[statusKey];
        
        return (
          <StatusBarButton
            key={statusKey}
            status={statusKey}
            currentStatus={localStatus}
            isUpdating={isUpdating}
            isMobile={isMobile}
            icon={config.icon}
            label={config.label}
            mobileLabel={config.mobileLabel}
            color={config.color}
            shadowColor={config.shadowColor}
            onClick={() => handleStatusChange(statusKey)}
            variant={variant}
          />
        );
      })}
    </div>
  );
};
