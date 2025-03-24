
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { Profile } from "@/types/profile";

type Status = Profile['status'];

interface StatusButtonProps {
  status: Status;
  currentStatus: Status;
  isLoading: boolean;
  icon: LucideIcon;
  label: string;
  mobileLabel: string;
  isMobile: boolean;
  onClick: () => void;
}

export const StatusButton = ({
  status,
  currentStatus,
  isLoading,
  icon: Icon,
  label,
  mobileLabel,
  isMobile,
  onClick
}: StatusButtonProps) => {
  const isActive = status === currentStatus;
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="flex-1 min-w-0"
    >
      <Button
        variant={isActive ? "default" : "outline"}
        size="default"
        onClick={onClick}
        disabled={isLoading}
        className={`
          w-full transition-all duration-200
          h-12 text-xs sm:text-sm font-medium px-1 sm:px-3
          ${isActive ? `bg-interpreter-${status} hover:bg-interpreter-${status}/90` : ''}
          ${isActive ? 'shadow-lg' : ''}
          ${!isActive ? 'bg-white dark:bg-gray-950' : ''}
        `}
      >
        <Icon className="h-3 w-3 sm:h-4 sm:w-4 min-w-3 sm:min-w-4 mr-0.5 sm:mr-1 flex-shrink-0" />
        <span className="truncate whitespace-nowrap">
          {isMobile ? mobileLabel : label}
        </span>
      </Button>
    </motion.div>
  );
};
