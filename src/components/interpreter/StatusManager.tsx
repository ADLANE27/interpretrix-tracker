
import React from "react";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { Status } from './StatusButton';
import { useStatusUpdater } from '@/hooks/useStatusUpdater';
import { getStatusConfig } from '@/utils/statusConfig';

interface StatusManagerProps {
  currentStatus?: Status;
  onStatusChange?: (newStatus: Status) => Promise<void>;
}

export const StatusManager = ({ currentStatus, onStatusChange }: StatusManagerProps = {}) => {
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
    <motion.div 
      className="flex flex-wrap items-center gap-2 mx-auto w-full max-w-screen-sm"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {(Object.keys(statusConfig) as Status[]).map((statusKey) => {
        const Icon = statusConfig[statusKey].icon;
        return (
          <motion.div
            key={statusKey}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 min-w-0"
          >
            <button
              className={`
                w-full transition-all duration-200
                h-12 text-xs sm:text-sm font-medium px-1 sm:px-3
                rounded-md flex items-center justify-center gap-1.5
                ${localStatus === statusKey ? `bg-gradient-to-r ${statusConfig[statusKey].color} text-white shadow-lg` : ''}
                ${localStatus !== statusKey ? 'bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300' : ''}
                ${isUpdating || isCircuitBroken || isProcessing ? 'opacity-70 cursor-not-allowed' : ''}
              `}
              onClick={() => handleStatusChange(statusKey, statusConfig)}
              disabled={isUpdating || isCircuitBroken || isProcessing}
            >
              <Icon className="h-3 w-3 sm:h-4 sm:w-4 min-w-3 sm:min-w-4 mr-0.5 sm:mr-1 flex-shrink-0" />
              <span className="truncate whitespace-nowrap">
                {isMobile ? statusConfig[statusKey].mobileLabel : statusConfig[statusKey].label}
              </span>
            </button>
          </motion.div>
        );
      })}
    </motion.div>
  );
};
