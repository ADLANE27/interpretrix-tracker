
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type Status = "available" | "unavailable" | "pause" | "busy";

export interface StatusConfig {
  color: string;
  shadowColor: string;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
}

export interface StatusButtonProps {
  status: Status;
  config: StatusConfig;
  isActive: boolean;
  isUpdating: boolean;
  isDisabled: boolean;
  variant: 'default' | 'compact';
  isMobile: boolean;
  onClick: () => void;
}

export const StatusButton: React.FC<StatusButtonProps> = ({
  status,
  config,
  isActive,
  isUpdating,
  isDisabled,
  variant,
  isMobile,
  onClick
}) => {
  const Icon = config.icon;
  
  return (
    <motion.button
      key={status}
      className={cn(
        "flex items-center gap-1.5 rounded-full transition-all duration-200",
        "py-2 flex-1 justify-center",
        variant === 'compact' ? "px-2 min-w-12" : "px-3 min-w-20",
        isActive 
          ? `bg-gradient-to-r ${config.color} text-white ${config.shadowColor} shadow-lg` 
          : "bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300",
        "backdrop-blur-sm",
        isUpdating ? "opacity-70 cursor-not-allowed" : "",
        isDisabled ? "opacity-50 cursor-not-allowed" : ""
      )}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      animate={isActive ? { scale: [1, 1.03, 1] } : {}}
      transition={{ duration: 0.2 }}
      disabled={isUpdating || isDisabled}
    >
      <Icon className={cn(
        "flex-shrink-0",
        variant === 'compact' || isMobile ? "h-3.5 w-3.5" : "h-4 w-4"
      )} />
      <span className={cn(
        "font-medium truncate",
        variant === 'compact' || isMobile ? "text-xs" : "text-sm"
      )}>
        {(variant === 'compact' || isMobile) ? config.mobileLabel : config.label}
      </span>
    </motion.button>
  );
};
