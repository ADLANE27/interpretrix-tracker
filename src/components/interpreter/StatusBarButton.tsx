
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Status } from '@/utils/statusButtonBarConfig';

interface StatusBarButtonProps {
  status: Status;
  currentStatus: Status;
  isUpdating: boolean;
  isMobile: boolean;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  mobileLabel: string;
  color: string;
  shadowColor: string;
  onClick: () => void;
  variant?: 'default' | 'compact';
}

export const StatusBarButton: React.FC<StatusBarButtonProps> = ({
  status,
  currentStatus,
  isUpdating,
  isMobile,
  icon: Icon,
  label,
  mobileLabel,
  color,
  shadowColor,
  onClick,
  variant = 'default'
}) => {
  const isActive = status === currentStatus;

  return (
    <motion.button
      className={cn(
        "flex items-center gap-1.5 rounded-full transition-all duration-200",
        "py-2 flex-1 justify-center",
        variant === 'compact' ? "px-2 min-w-12" : "px-3 min-w-20",
        isActive 
          ? `bg-gradient-to-r ${color} text-white ${shadowColor} shadow-lg` 
          : "bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300",
        "backdrop-blur-sm",
        isUpdating ? "opacity-70 cursor-not-allowed" : ""
      )}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      animate={isActive ? { scale: [1, 1.03, 1] } : {}}
      transition={{ duration: 0.2 }}
      disabled={isUpdating}
    >
      <Icon className={cn(
        "flex-shrink-0",
        variant === 'compact' || isMobile ? "h-3.5 w-3.5" : "h-4 w-4"
      )} />
      <span className={cn(
        "font-medium truncate",
        variant === 'compact' || isMobile ? "text-xs" : "text-sm"
      )}>
        {(variant === 'compact' || isMobile) ? mobileLabel : label}
      </span>
    </motion.button>
  );
};
