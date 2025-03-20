
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Clock, Coffee, X, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { Profile } from "@/types/profile";

interface StatusButtonsProps {
  currentStatus?: Profile['status'];
  onStatusChange: (newStatus: Profile['status']) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export const StatusButtons = ({ 
  currentStatus = "available",
  onStatusChange,
  isLoading = false,
  className = ""
}: StatusButtonsProps) => {
  const isMobile = useIsMobile();

  const statusConfig = {
    available: {
      color: "bg-interpreter-available hover:bg-interpreter-available/90",
      label: "Disponible",
      icon: Clock,
      mobileLabel: "Dispo"
    },
    busy: {
      color: "bg-interpreter-busy hover:bg-interpreter-busy/90",
      label: "En appel",
      icon: Phone,
      mobileLabel: "Appel"
    },
    pause: {
      color: "bg-interpreter-pause hover:bg-interpreter-pause/90",
      label: "En pause",
      icon: Coffee,
      mobileLabel: "Pause"
    },
    unavailable: {
      color: "bg-interpreter-unavailable hover:bg-interpreter-unavailable/90",
      label: "Indisponible",
      icon: X,
      mobileLabel: "Indispo"
    }
  };

  const handleStatusChange = async (newStatus: Profile['status']) => {
    if (status === newStatus || isLoading) return;
    await onStatusChange(newStatus);
  };

  return (
    <motion.div 
      className={`flex flex-wrap items-center gap-2 mx-auto w-full max-w-screen-sm ${className}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {(Object.keys(statusConfig) as Profile['status'][]).map((statusKey) => {
        const Icon = statusConfig[statusKey].icon;
        return (
          <motion.div
            key={statusKey}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 min-w-0"
          >
            <Button
              variant={currentStatus === statusKey ? "default" : "outline"}
              size="default"
              onClick={() => handleStatusChange(statusKey)}
              disabled={isLoading}
              className={`
                w-full transition-all duration-200
                h-12 text-xs sm:text-sm font-medium px-1 sm:px-3
                ${currentStatus === statusKey ? statusConfig[statusKey].color : ''}
                ${currentStatus === statusKey ? 'shadow-lg' : ''}
                ${currentStatus !== statusKey ? 'bg-white dark:bg-gray-950' : ''}
              `}
            >
              <Icon className="h-3 w-3 sm:h-4 sm:w-4 min-w-3 sm:min-w-4 mr-0.5 sm:mr-1 flex-shrink-0" />
              <span className="truncate whitespace-nowrap">
                {isMobile ? statusConfig[statusKey].mobileLabel : statusConfig[statusKey].label}
              </span>
            </Button>
          </motion.div>
        );
      })}
    </motion.div>
  );
};
