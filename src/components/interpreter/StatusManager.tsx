
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { Profile } from "@/types/profile";
import { useInterpreterStatus } from "@/hooks/useInterpreterStatus";
import { StatusButton } from "./StatusButton";
import { statusConfig } from "@/utils/statusConfig";

type Status = Profile['status'];

interface StatusManagerProps {
  currentStatus?: Status;
  onStatusChange?: (newStatus: Status) => Promise<void>;
}

export const StatusManager = ({ currentStatus, onStatusChange }: StatusManagerProps = {}) => {
  const { status, isLoading, handleStatusChange } = useInterpreterStatus(currentStatus, onStatusChange);
  const isMobile = useIsMobile();

  return (
    <motion.div 
      className="flex flex-wrap items-center gap-2 mx-auto w-full max-w-screen-sm"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {(Object.keys(statusConfig) as Status[]).map((statusKey) => {
        const config = statusConfig[statusKey];
        
        return (
          <StatusButton
            key={statusKey}
            status={statusKey}
            currentStatus={status}
            isLoading={isLoading}
            icon={config.icon}
            label={config.label}
            mobileLabel={config.mobileLabel}
            isMobile={isMobile}
            onClick={() => handleStatusChange(statusKey)}
          />
        );
      })}
    </motion.div>
  );
};
